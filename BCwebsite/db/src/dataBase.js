import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, query, orderByChild, equalTo, onValue, update, runTransaction, limitToFirst, startAfter } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getDatabase(app);

function checkUser() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                console.log(`Usuário está logado: ${user}`);
                const userAuthData = {
                    uid: user.uid,
                    email: user.email
                };

                // Enterprise primeiro
                const enterpriseRef = ref(db, `users/enterprise/${user.uid}`);
                get(enterpriseRef)
                    .then((enterpriseSnapshot) => {
                        const enterpriseUserData = enterpriseSnapshot.val();
                        if (enterpriseUserData) {
                            console.log(`Dados do usuário de empresa encontrados: ${enterpriseUserData}`);
                            resolve({ status: 'log', userAuthData, userData: enterpriseUserData });
                        } else {
                            // Verifica normal
                            const normalRef = ref(db, `users/normal/${user.uid}`);
                            get(normalRef)
                                .then((normalSnapshot) => {
                                    const normalUserData = normalSnapshot.val();
                                    if (normalUserData) {
                                        console.log(`Dados do usuário normal encontrados: ${normalUserData}`);
                                        resolve({ status: 'log', userAuthData, userData: normalUserData });
                                    } else {
                                        console.warn('Usuário encontrado, mas sem dados específicos de tipo (empresa ou normal).');
                                        resolve({ status: 'log', userAuthData, userData: {} });
                                    }
                                })
                                .catch((normalError) => {
                                    console.error(`Erro ao obter dados de usuário normal: ${normalError}`);
                                    reject(normalError);
                                });
                        }
                    })
                    .catch((enterpriseError) => {
                        console.error(`Erro ao obter dados de usuário de empresa: ${enterpriseError}`);
                        reject(enterpriseError);
                    });
            } else {
                console.log('Usuário não está logado');
                resolve({ status: 'not log' });
            }
        });
    });
}

async function getValues(reference) {
    try {
        const snapshot = await get(ref(db, reference));
        if (snapshot.exists()) {
            return snapshot.val()
        } else {
            console.log("No data available");
            return [];
        }
    } catch (error) {
        console.error(`Error fetching data: ${error}`);
        throw error;
    }
}

async function signUp(name, email, password, birthYear) {
    try {
        // Salvar o usuário atualmente logado para relogar
        const currentUser = auth.currentUser;

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        console.log('Usuário criado:', newUser);
        await set(ref(db, `users/normal/${newUser.uid}`), {
            userName: name,
            email: newUser.email,
            birthDay: birthYear
        });

        // Deslogar o novo usuário
        await signOut(auth);

        // Reloga o usuário original
        if (currentUser) {
            await signInWithEmailAndPassword(auth, currentUser.email, currentUser.password);
            console.log('Usuário original reautenticado.');
        }

    } catch (error) {
        console.error(`Erro ao criar usuário: ${error}`);
    }
}

async function signIn(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('Usuário logado: ${userCredential.user}');
    } catch (error) {
        console.error(`Erro de login: ${error.code}, ${error.message}`);
    }
}

async function findUserByEmail(email) {
    try {
        const snapshot = await get(ref(db, `users/enterprise`));
        const users = snapshot.val();
        if (users) {
            for (const userNumber in users) {
                if (Object.prototype.hasOwnProperty.call(users, userNumber)) {
                    const userData = users[userNumber];
                    if (userData.email === email) {
                        const userInfo = {
                            userId: userNumber,
                            userName: userData.username,
                            birthYear: userData.birthYear,
                            companyCode: userData.companyCode,
                            companyName: userData.companyName,
                            companyUserLevel: userData.companyUserLevel,
                            userEmail: userData.email,
                            userPassword: userData.password
                        };
                        return userInfo;
                    }
                }
            }
            return null; // Retorna null se nn achar email
        } else {
            console.log("Nenhum usuário encontrado.");
            return null;
        }
    } catch (error) {
        console.error(`Ocorreu um erro ao buscar os usuários: ${error}`);
        return null;
    }
}

async function buscarUsuariosPorCompanyID(companyID, pageSize = 14, lastVisibleUser = null) {
    const usersRef = ref(db, 'users/enterprise');
    let queryFindByCI;

    if (lastVisibleUser) {
        console.log("Paginação: Carregando usuários após", lastVisibleUser.key);
        queryFindByCI = query(
            usersRef,
            orderByChild('companyCode'),
            equalTo(companyID),
            startAfter(lastVisibleUser.key),
            limitToFirst(pageSize)
        );
    } else {
        console.log("Carregando a primeira página de usuários");
        queryFindByCI = query(
            usersRef,
            orderByChild('companyCode'),
            equalTo(companyID),
            limitToFirst(pageSize)
        );
    }

    try {
        const snapshot = await get(queryFindByCI);
        let usersData = [];
        let lastVisible = null;

        if (snapshot.exists()) {
            let promises = [];

            snapshot.forEach((childSnapshot) => {
                const userID = childSnapshot.key;
                const userData = childSnapshot.val();
                lastVisible = childSnapshot;

                // Adicionamos a promessa de obter a imagem ao array de promessas
                const imagePromise = getImage(`users/${userID}.png`)
                    .then(url => {
                        userData.imageUrl = url; // Adicionamos a URL da imagem aos dados do usuário
                        return { userID, userData };
                    })
                    .catch(error => {
                        console.error(`Erro ao obter imagem para o usuário ${userID}: ${error.message}`);
                        userData.imageUrl = ''; // Define uma URL vazia ou uma imagem padrão
                        return { userID, userData };
                    });

                promises.push(imagePromise);
            });

            // Aguarda todas as promessas de obtenção de imagens serem resolvidas
            usersData = await Promise.all(promises);
        }

        return { usersData, lastVisible };
    } catch (error) {
        console.error(`Erro ao buscar usuários: ${error.message}`);
        return { usersData: [], lastVisible: null };
    }
}


function writeCompanyData(companyId, companyName) {
    set(ref(db, `company/${companyId}`), {
        companyName: companyName
    });
}

async function searchCompanyData(companyCode) {
    try {
        const snapshot = await get(ref(db, `company/${companyCode}`));
        const company = snapshot.val();

        const companyInfo = {
            companyId: companyCode,
            companyName: company.companyName
        };
        return companyInfo;
    } catch (error) {
        console.error(`Ocorreu um erro pegar os dados da empresa: ${error}`);
        return null;
    }
}

async function writeGameData(companyId, path, partName, deep) {
    let fatherData = await getValues(`company/${companyId}/games/${path}`);

    if (['14-', '15-17', '18-24', '25-39', '40-59', '60+'].some(key => fatherData.hasOwnProperty(key))) {
        const keysToRemove = ['14-', '15-17', '18-24', '25-39', '40-59', '60+'];
        const updates = {};
        keysToRemove.forEach(key => {
            updates[`${path}/${key}`] = null;
        });

        update(ref(db, `company/${companyId}/games`), updates)
        update(ref(db, `company/${companyId}/games/${path}/${partName}`), fatherData)
    } else {
        let data = {
            '14-': 0,
            '15-17': 0,
            '18-24': 0,
            '25-39': 0,
            '40-59': 0,
            '60+': 0
        };

        update(ref(db, `company/${companyId}/games/${path}/${partName}`), data)
    }
}

async function writeEnterpriseUserData(name, email, department, password, companyName, companyCode, birthYear, selected) {
    const userDataList = {};

    if (name) userDataList.username = name;
    if (email) userDataList.email = email;
    if (department) userDataList.department = department;
    if (password) userDataList.password = password;
    if (companyName) userDataList.companyName = companyName;
    if (companyCode) userDataList.companyCode = companyCode;
    if (birthYear) userDataList.birthYear = birthYear;

    const currentUser = auth.currentUser;

    if (selected === 'null' || selected === null || selected === undefined) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await set(ref(db, `users/enterprise/${user.uid}`), userDataList);

        await auth.signOut();

        if (currentUser) {
            await signInWithEmailAndPassword(auth, currentUser.email, currentUser.password);
        }
    } else {
        await set(ref(db, `users/enterprise/${user.uid}`), userDataList);
    }
}

function uploadImage(companyId, path, name) {
    return new Promise((resolve, reject) => {
        var file = document.getElementById('fileInput').files[0];
        console.log(document.getElementById('fileInput').files[0]);
        var storageReference = storageRef(storage, `company/${companyId}/games/${path}/${name}`);
        var uploadTask = uploadBytesResumable(storageReference, file);

        uploadTask.on('state_changed',
            function (snapshot) {
                var progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                console.log(`Upload is ${progress} done`);
            }, function (error) {
                console.error(`Erro no upload: ${error}`);
                reject(error);
            }, function () {
                getDownloadURL(uploadTask.snapshot.ref).then(function (downloadURL) {
                    console.log(`File available at ${downloadURL}`);
                    resolve('uploaded');
                }).catch(error => {
                    reject(error);
                });
            }
        );
    });
}

async function getImage(path) {
    let sRef = storageRef(storage, path);
    try {
        let url = await getDownloadURL(sRef);
        return url;
    } catch (error) {
        console.error(`Erro ao obter o URL da imagem: ${error}`);
        let url = await getDownloadURL(storageRef(storage, 'users/null.png'))
        return url
        throw error;
    }
}


export {
    checkUser,
    buscarUsuariosPorCompanyID,
    searchCompanyData,
    writeEnterpriseUserData,
    writeGameData,
    signIn,
    signUp,
    getValues,
    uploadImage,
    getImage
}


