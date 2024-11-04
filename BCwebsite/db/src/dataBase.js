import { firebaseConfig } from './firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getDatabase, ref, set, get, query, orderByChild, equalTo, onValue, update, runTransaction, limitToFirst, startAfter } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const auth = getAuth(app);
const db = getDatabase(app);


//SECTIONS
const body = document.querySelector('body');
const contentSection = document.querySelector('.content');
const loginSection = document.querySelector('.login');
const createEnterpriseUserSection = document.querySelector('.createEnterpriseUser');
const settingsSection = document.querySelector('.settings');

//CADASTRO DE USUARIO DENTRO DA EMPRESA
const registerUserEnterpriseBt = document.getElementById('registerUserBt');
const userNameEnterpriseRegister = document.getElementById('userNameEnterpriseRegister');
const userEmailEnterpriseRegister = document.getElementById('userEmailEnterpriseRegister');
const userDepartmentEnterpriseRegister = document.getElementById('department');
const userPasswordEnterpriseRegister = document.getElementById('userPasswordEnterpriseRegister');
const userConfirmPasswordEnterpriseRegister = document.getElementById('userConfirmPasswordEnterpriseRegister');
const userBirthDateRegister = document.getElementById('userBirthDateRegister');
const userListContainer = document.querySelector('.userListContainer');

//SYSTEM
const systemNavContainer = document.querySelector('.systemNavContainer');
const addPath = document.getElementById('addPath');
const pathElement = document.querySelector('.path');
const data = await getValues('company/10001/games/')
console.log('ate aqui')
const graphicColors = ["#0D1F22", "#264027", "#3C5233", "#6F732F", "#B38A58", "#fefae0"];

//VARIAVEIS 
var userInfo = {}
var currentPath = [];
let averageHistory = [];
var currentData = data;
console.log(data)

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



function updateView(companyId) {
    addPath.innerHTML = '';
    averageHistory.splice(0, averageHistory.length);
    pathElement.innerHTML = currentPath.join(' > ') || 'Home';

    let currentDepth = currentPath.length;
    console.log(`CURRENT DEEP ${currentPath}`)
    if (currentDepth === 0) {
        console.log('Raiz');
        document.body.style.backgroundImage = '';
    } else if (currentDepth === 1) {
        getImage(`company/${companyId}/games/${currentPath}`)
        .then(url => {
            console.log(url)
            body.style.backgroundImage = `url(${url})`;
            body.style.backgroundSize = 'cover';
            body.style.backdropFilter = 'blur(15px)'
        })
        .catch(err => {console.log(err)})
        
    }

    if (typeof currentData === 'object' && !Array.isArray(currentData)) {
        let addBackButton = document.createElement('h5');
        addBackButton.classList.add('newPath');
        addBackButton.id = 'backButton';
        addBackButton.innerText = '<< BACK';
        addBackButton.addEventListener("click", () => {
            currentPath.pop();
            currentData = data;
            for (let key of currentPath) {
                currentData = currentData[key];
            }
            averageHistory.splice(0, averageHistory.length);
            updateView(companyId);
        });
        addPath.appendChild(addBackButton);
        let endOfThePath = ['14-', '15-17', '18-24', '25-39', '40-59', '60+']
        for (let key in currentData) {
            console.log(key);
            if (typeof currentData[key] === 'object' && !Array.isArray(currentData[key])) {
                let newPath = document.createElement('h5');
                newPath.classList.add('newPath');
                newPath.id = key;
                newPath.innerHTML = key;
                newPath.style.cursor = 'pointer';
                newPath.addEventListener('click', () => {
                    navigate(key, currentPath, companyId)
                    averageHistory.splice(0, averageHistory.length);
                });
                console.log(newPath)
                addPath.appendChild(newPath);
                let average = calculateAverage(currentData[key]);
                averageHistory.push({ [key]: parseFloat(average.toFixed(1)) });
            } else if (endOfThePath.includes(key)){
                //Verifica se esta na raiz e mostra a media por faixa etaria
                averageHistory.push({ [key]: currentData[key] });
            }
        }

        let addNewPath = document.createElement('h5');
        addNewPath.classList.add('newPath');
        addNewPath.id = 'addNewPath';
        addNewPath.innerText = '+';
        addNewPath.style.cursor = 'copy';
        addNewPath.addEventListener("click", () => {
            let addModal = document.querySelector('.addModal');
            let modal = document.createElement('div');
            let addGameCreatePart = currentPath.length < 1 ? `<input type="file" id="fileInput" />` : '';
            modal.classList.add('modal');
            modal.id = 'modal';
            let modalContent = `
                <div class="modal-content">
                    <span class="close-button">&times;</span>
                    <h2>Create new game part</h2>
                    <form id="editGameForm">
                        <div class="form-group">
                            <label for="partTitle">Game Title</label>
                            <input type="text" id="partTitle" name="partTitle" placeholder="Enter game title">
                        </div>
                        <div class="form-group">
                            <label for="partDescription">Description</label>
                            <textarea id="partDescription" name="partDescription" placeholder="Enter game description"></textarea>
                        </div>
                        <div class="form-group">
                        ${addGameCreatePart}
                        </div>
                        <button type="submit" id="submitGamePart">Save Changes</button>
                    </form>
                </div>
            `;
            modal.innerHTML = modalContent;
            let closeButton = modal.querySelector(".close-button");
            let submitGamePartBt = modal.querySelector('#submitGamePart');

            closeButton.addEventListener("click", function () {
                modal.style.display = "none";
            });
            window.addEventListener("click", function (event) {
                if (event.target == modal) {
                    addModal.innerHTML = "";
                }
            });
            console.log(currentDepth)

            submitGamePartBt.addEventListener("click", async () => {
                event.preventDefault()
                let partName = modal.querySelector('#partTitle');
                let partDescription = modal.querySelector('#partDescription');

                try {
                    if (currentDepth < 1) {
                        await uploadImage(companyId, currentPath, partName.value)
                    }
                    await writeGameData(companyId, currentPath, partName.value, currentDepth);
                    modal.style.display = "none";
                    location.reload();
                } catch (error) {
                    console.log(`Erro durante upload da imagem do jogo ${error}`);
                }



            });
            addModal.appendChild(modal);
        });
        addPath.appendChild(addNewPath);
    }

    if (currentPath.length >= 0) {
        drawGraphic(true, averageHistory);
    }
}

function navigate(key, currentPath, companyId) {
    averageHistory.splice(0, averageHistory.length);
    currentPath.push(key);
    currentData = currentData[key];
    updateView(companyId);
}

function calculateAverage(node) {
    let total = 0;
    let count = 0;

    function traverseCA(subNode) {
        if (typeof subNode === 'object' && !Array.isArray(subNode)) {
            for (let key in subNode) {
                if (key != 'gameId') {
                    traverseCA(subNode[key]);
                }
            }
        } else if (typeof subNode === 'number' && subNode !== 0) {
            total += subNode;
            count++;
        }
    }

    traverseCA(node);
    return count > 0 ? total / count : 0;
}

function cleanSystem(section, companyId) {
    // Lista de todas as seções disponíveis
    let sectionList = [contentSection, loginSection, createEnterpriseUserSection, settingsSection];

    // Obter o hash atual, removendo o '#' do início
    let hash = section ? section : window.location.hash.substring(1);

    // Função para esconder todas as seções
    function hideAllSections() {
        sectionList.forEach(sec => sec.style.display = 'none');
    }

    // Função para mostrar a seção e realizar ações extras, se necessário
    function showSection(sectionElement, callback) {
        sectionElement.style.display = 'flex';
        if (callback) callback();
    }

    // Objeto para mapeamento das seções
    const hashMap = {
        'contentSection': () => showSection(contentSection, () => updateView(companyId)),
        'usersSection': () => showSection(createEnterpriseUserSection, () => renderizarUsuarios(userListContainer, companyId)),
        'loginSection': () => showSection(loginSection),
        'settingsSection': () => showSection(settingsSection, () => showSettings(settingsSection))
    };

    // Esconder todas as seções antes de mostrar a que precisamos
    hideAllSections();

    // Se o hash existir no hashMap, executa a função correspondente, senão, exibe 'contentSection' como padrão
    (hashMap[hash] || hashMap['contentSection'])();
}

const searchUserInput = document.getElementById('searchUser');
    const searchUserBt = document.getElementById('searchUserBt');
    const departmentFilter = document.getElementById('departmentFilter');
    const sortOrder = document.getElementById('sortOrder');
    // const userListContainer = document.querySelector('.userListContainer');

    const companyID = "your_company_id"; // Substitua pelo ID real da empresa

    // Função para capturar os valores de entrada e filtrar os usuários
    function buscarUsuarios() {
        const searchTerm = searchUserInput.value.toLowerCase().trim();
        const selectedDepartment = departmentFilter.value;
        const sortOption = sortOrder.value;

        renderizarUsuarios(userListContainer, companyID, 14, null, searchTerm, selectedDepartment, sortOption);
    }

    // Eventos que disparam a busca
    searchUserBt.addEventListener('click', buscarUsuarios);
    departmentFilter.addEventListener('change', buscarUsuarios);
    sortOrder.addEventListener('change', buscarUsuarios);

// Atualizando a função renderizarUsuarios para usar filtros e ordenação
async function renderizarUsuarios(whereToAdd, companyID, pageSize = 14, lastVisibleUser = null, searchTerm = '', selectedDepartment = '', sortOption = 'name') {
    // Limpa o container e zera a seleção de usuários
    whereToAdd.innerHTML = '';
    localStorage.setItem('userIdSelected', null);

    try {
        const { usersData, lastVisible } = await buscarUsuariosPorCompanyID(companyID, pageSize, lastVisibleUser);

        if (usersData.length === 0) {
            whereToAdd.innerHTML = '<p>No users found.</p>';
            return;
        }

        // Filtra os usuários pelo termo de busca e departamento selecionado
        let filteredUsers = usersData.filter(({ userData }) => {
            const matchesSearchTerm = userData.username.toLowerCase().includes(searchTerm);
            const matchesDepartment = selectedDepartment ? userData.department === selectedDepartment : true;
            return matchesSearchTerm && matchesDepartment;
        });

        // Ordena os usuários pela opção selecionada
        if (sortOption === 'name') {
            filteredUsers.sort((a, b) => a.userData.username.localeCompare(b.userData.username));
        } else if (sortOption === 'date') {
            filteredUsers.sort((a, b) => (a.userData.creationDate || '').localeCompare(b.userData.creationDate || ''));
        }

        // Verifica se os usuários já foram adicionados anteriormente
        let existingUserIDs = Array.from(whereToAdd.querySelectorAll('.userConsultReturnContainer'))
            .map(el => el.dataset.userId);

        // Adiciona o cabeçalho uma vez
        let headerDiv = `
            <div class="userConsultReturnContainer">
                <div class="userListImageContainer">
                    <p>Image</p>
                </div>
                <p>Username</p>
                <p>Department</p>
                <p>Options</p>
            </div>
        `;
        let headerElement = document.createElement('div');
        headerElement.innerHTML = headerDiv;
        whereToAdd.appendChild(headerElement);

        // Adiciona os usuários à lista, evitando duplicações
        filteredUsers.forEach(({ userID, userData }) => {
            if (!existingUserIDs.includes(userID)) {  // Evita adicionar usuários duplicados
                let userDiv = `
                    <div class="userConsultReturnContainer" data-user-id="${userID}">
                        <div class="userListImageContainer">
                            <img src="${userData.imageUrl}" class="userListImage"/>
                        </div>
                        <p>${userData.username}</p>
                        <p>${userData.department}</p>
                        <div class="profileListOptContainer">
                            <a>
                                <img src="../assets/icons/lapis.svg" class="profileListOpt"></img>
                            </a>
                            <a>
                                <img src="../assets/icons/lixo.svg" class="profileListOpt"></img>
                            </a>
                        </div>
                    </div>
                `;

                let userElement = document.createElement('div');
                userElement.innerHTML = userDiv;
                let userConsultReturnContainer = userElement.firstElementChild;
                whereToAdd.appendChild(userConsultReturnContainer);

                // Adiciona evento de clique para abrir os detalhes do usuário
                userConsultReturnContainer.addEventListener("click", () => {
                    whereToAdd.innerHTML = '';
                    localStorage.setItem('userIdSelected', userID);
                    let userSelectedCard = `
                        <div class="profile-container">
                            <div class="profile-header">
                                <img src="" alt="Foto de Fundo" class="background-img">
                                <div class="profile-picture-container">
                                    <img src="${userData.imageUrl}" alt="Foto de Perfil" class="profile-picture">
                                </div>
                            </div>
                            <div class="profile-info">
                                <h1>${userData.username}</h1>
                                <h2>${userData.department}</h2>
                                <div class="divideProfile">
                                    <div class="sideOne">
                                        <div class="info-sections">
                                            <div class="info-box">
                                                <h3>Localização</h3>
                                                <p>Cidade, País</p>
                                            </div>
                                            <div class="info-box">
                                                <h3>Email</h3>
                                                <p>${userData.email}</p>
                                            </div>
                                            <div class="info-box">
                                                <h3>Telefone</h3>
                                                <p>(99) 99999-9999</p>
                                            </div>
                                            <div class="info-box">
                                                <h3>Redes Sociais</h3>
                                                <p><a href="#">@Instagram</a></p>
                                                <p><a href="#">@LinkedIn</a></p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div class="sideTwo">
                                    <div class="divideSideTwo">
                                            <div class="bioBox">
                                            <h3>Biography</h3>
                                            </div>
                                            
                                            <div class="insigniasBox">
                                                <h3>Insignias</h3>
                                            </div>
                                            </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                    whereToAdd.innerHTML = userSelectedCard;
                });
            }
        });

        // Adiciona o botão de paginação se houver mais usuários
        if (lastVisible) {
            let paginationDiv = document.createElement('div');
            paginationDiv.classList.add('pagination');

            if (usersData.length === pageSize) {
                let nextButton = document.createElement('button');
                nextButton.innerText = 'Next';
                nextButton.addEventListener('click', () => {
                    renderizarUsuarios(whereToAdd, companyID, pageSize, lastVisible, searchTerm, selectedDepartment, sortOption);
                });
                paginationDiv.appendChild(nextButton);
            }

            whereToAdd.appendChild(paginationDiv);
        }
    } catch (error) {
        console.error(`Erro ao buscar usuários: ${error.message}`);
    }
}

async function startSystem(userList, companyDataVar) {
    const systemNav = `
        <div class="systemNav">   
            <button id="systemBt">System</button>
            <button id="usersBt">Users</button>
            <button id="settingsBt">Settings</button>
        </div>
    `;
    systemNavContainer.innerHTML = systemNav;
    const systemBt = document.getElementById('systemBt');
    const usersBt = document.getElementById('usersBt');
    const settingsBt = document.getElementById('settingsBt');

    cleanSystem(null, companyDataVar.companyId);

    systemBt.addEventListener("click", function () {
        window.location.hash = 'contentSection';
        cleanSystem(null, companyDataVar.companyId);
        addPath.innerHTML = '';
    });
    usersBt.addEventListener("click", function () {
        window.location.hash = 'usersSection';
        cleanSystem(null, companyDataVar.companyId);
    });

    // registerUserEnterpriseBt.addEventListener("click", () => {
    //     if (userNameEnterpriseRegister.value &&
    //         userEmailEnterpriseRegister.value && userDepartmentEnterpriseRegister.value &&
    //         userPasswordEnterpriseRegister.value &&
    //         userBirthDateRegister.value &&
    //         userConfirmPasswordEnterpriseRegister.value === userPasswordEnterpriseRegister.value) {
    //         writeEnterpriseUserData(userNameEnterpriseRegister.value, userEmailEnterpriseRegister.value, userDepartmentEnterpriseRegister.value, userPasswordEnterpriseRegister.value, 'BeatConnect', userList.companyCode, userBirthDateRegister.value);
    //         buscarUsuariosPorCompanyID(userList.companyCode, userListContainer);
    //     }
    //     userNameEnterpriseRegister.value = ''
    //     userEmailEnterpriseRegister.value = ''
    //     userPasswordEnterpriseRegister.value = ''
    //     userBirthDateRegister.value = ''
    //     userConfirmPasswordEnterpriseRegister.value = ''
    //     userPasswordEnterpriseRegister.value = ''
    // });

    settingsBt.addEventListener("click", function () {
        window.location.hash = 'settingsSection';
        cleanSystem(null, companyDataVar.companyId);
    });
    // console.log(userList.userUid)
    // getImage(`users/${userList.userUid}.png`).then(url => {
    //     const settingsConfig = `
    //         <div class="settingsContainer">
    //             <h1>Profile Settings</h1>
    //             <div class="profileSettingContainer">
    //                 <img src="${url}">
    //                 <div class="profileSettingsTextContent">
    //                     <h2>${userList.username}</h2>
    //                     <h2>${userList.email}</h2>
    //                     <h2>${userList.department}</h2>
    //                     <h2>${userList.userUid}</h2>
    //                 </div>
    //             </div>
    //         </div>
    // `
    //     settingsSection.innerHTML = settingsConfig
    // })
}

function drawGraphic(condition, outComeArray) {
    let clonedInfoArray = JSON.parse(JSON.stringify(outComeArray));
    let addGraphic = document.getElementById("graphics");
    let currentChartType = 'BarChart';
    addGraphic.innerHTML = '';

    if (condition == true) {

        google.charts.load("current", { packages: ["corechart"] });
        google.charts.setOnLoadCallback(() => {
            drawChart(clonedInfoArray);
        });

        function drawChart(infoArray) {

            let data = new google.visualization.DataTable();
            data.addColumn('string', 'Age');
            data.addColumn('number', 'HeartBeatAverage');
            data.addColumn({ type: 'string', role: 'style' });

            infoArray.forEach((item, index) => {
                const key = Object.keys(item)[0];
                const value = parseFloat(item[key]);
                const color = graphicColors[index % graphicColors.length];

                data.addRow([key, value, color]);
            });

            var view = new google.visualization.DataView(data);
            view.setColumns([0, 1, {
                calc: "stringify",
                sourceColumn: 1,
                type: "string",
                role: "annotation"
            }, 2]);

            var options = {
                animation: {
                    duration: 1000,
                    easing: 'out',
                },
                title: "Average heartbeat by age group",
                width: 880,
                height: 500,
                backgroundColor: 'transparent',
                bar: { groupWidth: "95%" },
                legend: { position: "none" },
                titleTextStyle: {
                    color: '#FCFAF9',
                    fontSize: 20
                },
                hAxis: {
                    viewWindow: {
                        min: 0
                    },
                    textStyle: {
                        color: '#FCFAF9'
                    }
                },
                vAxis: {
                    textStyle: {
                        color: '#FCFAF9'
                    }
                },
                is3D: true
            };



            let chart;
            if (currentChartType === 'PieChart') {
                chart = new google.visualization.PieChart(addGraphic);
            } else {
                chart = new google.visualization.BarChart(addGraphic);
            }
            chart.draw(view, options);
        }
    } else {
        addGraphic.innerHTML = '';
    }
}


function checkUserAndProceed() {
    return new Promise((resolve, reject) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // currentUserUid = user;
                console.log(`Usuário está logado:`, user);
                const userAuthData = {
                    uid: user.uid,
                    email: user.email
                };

                try {
                    // Verifica se o usuário é de empresa
                    const enterpriseRef = ref(db, `users/enterprise/${user.uid}`);
                    const enterpriseSnapshot = await get(enterpriseRef);
                    const enterpriseUserData = enterpriseSnapshot.val();

                    if (enterpriseUserData) {
                        console.log(`Dados do usuário de empresa encontrados:`, enterpriseUserData);
                        proceedWithUser({ status: 'log', userAuthData, userData: enterpriseUserData });
                    } else {
                        // Se não for de empresa, verifica se é um usuário normal
                        const normalRef = ref(db, `users/normal/${user.uid}`);
                        const normalSnapshot = await get(normalRef);
                        const normalUserData = normalSnapshot.val();

                        if (normalUserData) {
                            console.log(`Dados do usuário normal encontrados:`, normalUserData);
                            proceedWithUser({ status: 'log', userAuthData, userData: normalUserData });
                        } else {
                            console.warn('Usuário encontrado, mas sem dados específicos de tipo (empresa ou normal).');
                            proceedWithUser({ status: 'log', userAuthData, userData: {} });
                        }
                    }
                } catch (error) {
                    console.error(`Erro ao obter dados de usuário: ${error}`);
                    reject(error);
                }
            } else {
                console.log('Usuário não está logado');
                showLoginScreen();
                resolve({ status: 'not log' });
            }
        });
    });
}

function proceedWithUser(result) {
    if (result.status === 'log') {
        console.log(`Usuário logado com dados de autenticação:`, result.userAuthData);
        console.log(`Dados do usuário do banco de dados:`, result.userData);
        userInfo = result.userData;

        (async () => {
            try {
                const companyData = await searchCompanyData(userInfo.companyCode);
                if (!companyData) {
                    console.warn(`Nenhum dado encontrado para o código da empresa: ${userInfo.companyCode}`);
                    return;
                }
                userInfo.userUid = result.userAuthData.uid;

                startSystem(userInfo, companyData);
            } catch (error) {
                console.error(`Error fetching company data: ${error}`);
                showLoginScreen();
            }
        })();
    }
}

async function searchCompanyData(companyCode) {
    try {
        const snapshot = await get(ref(db, `company/${companyCode}`));
        const company = snapshot.val();

        // Adicionada a verificação se company não é null
        if (!company) {
            console.warn(`Nenhum dado encontrado para o código da empresa: ${companyCode}`);
            return null;
        }

        const companyInfo = {
            companyId: companyCode,
            companyName: company.companyName
        };
        return companyInfo;
    } catch (error) {
        console.error(`Ocorreu um erro ao buscar os dados da empresa: ${error}`);
        return null;
    }
}

function showLoginScreen() {
    loginSection.style.display = 'flex';
    let loginBt = document.getElementById('bt');

    let emailInput = document.getElementById('emailInput');
    let passwordInput = document.getElementById('passwordInput');
    let logIn = async () => {
        try {
            await signIn(emailInput.value, passwordInput.value);
            const result = await checkUserAndProceed();
            if (result.status === 'log') {
                location.reload();
            } else {
                console.log('Usuário não logado');
            }
        } catch (error) {
            console.error(`Erro ao verificar usuário: ${error}`);
        }
    };

    loginBt.addEventListener("click", logIn);
    window.addEventListener("keydown", event => event.key === "Enter" && logIn());
}

// Inicia a verificação do usuário e execução do sistema
checkUserAndProceed().catch((error) => {
    console.error(`Erro ao verificar usuário: ${error}`);
    showLoginScreen();
});



async function showSettings(whereToAdd) {
    console.log(userInfo)
    getImage(`users/${userInfo.userUid}.png`).then(url => {
        let settingsDiv = `
        <div class="profile-container">
                    <div class="profile-header">
                        <div class="profile-picture-container">
                            <img src="${url}" alt="Foto de Perfil" class="profile-picture" id="profilePicture">
                            <input type="file" id="fileInput" style="display: none;" />
                        </div>
                    </div>
                    <div class="profile-info">
                        <h1 class="editable-text" data-field="username">${userInfo.username}</h1>
                        <h2 class="editable-text" data-field="department">${userInfo.department}</h2>
                        <div class="divideProfile">
                            <div class="sideOne">
                                <div class="info-sections">
                                    <div class="info-box">
                                        <h3>Localização 📍</h3>
                                        <p class="editable-text" data-field="location">${userInfo.country}, ${userInfo.state}</p>
                                    </div>
                                    <div class="info-box">
                                        <h3>Email ✉️</h3>
                                        <p class="editable-text" data-field="email">${userInfo.email}</p>
                                    </div>
                                    <div class="info-box">
                                        <h3>Telefone 📞</h3>
                                        <p class="editable-text" data-field="phone">${userInfo.phone}</p>
                                    </div>
                                    <div class="info-box">
                                        <h3>Redes Sociais 📥</h3>
                                        <a href="${userInfo.instagramLink}" class="editable-text" data-field="instagram">@Instagram</a> 
                                        
                                        <a href="${userInfo.linkedinLink}" class="editable-text" data-field="linkedin">@LinkedIn</a>
                                    </div>
                                </div>
                            </div>
                
                            <div class="sideTwo">
                                <div class="divideSideTwo">
                                    <div class="bioBox">
                                        <h3>Biography</h3>
                                        <input type="text" class="bioInput" id="bioInput" value="${userInfo.bio}">
                                        <button class="bioSaveBt" id="bioSaveBt">
                                        <img src="../assets/icons/check.svg" />
                                        </ button>
                                    </div>
                                    <div class="insigniasBox" id="insigniasBox">
                                        <h3>Insignias</h3>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
        `
        whereToAdd.innerHTML = settingsDiv;

        const bioSaveBt = document.getElementById("bioSaveBt");
        const profilePicture = document.getElementById("profilePicture");
        const fileInput = document.getElementById('fileInput');
        const insigniasBox = document.getElementById("insigniasBox")

        profilePicture.addEventListener('click', () => {
            fileInput.click(); // Simula um clique no input de arquivo
        });
        
        // Quando o usuário selecionar um arquivo, fazer o upload da nova imagem
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const userUid = userInfo.userUid; // Assumindo que você já tem o UID do usuário disponível
                updateProfilePicture(userUid, file);
            }
        });
        
        // Função para substituir a foto de perfil
        async function updateProfilePicture(userUid, file) {
            try {
                // Cria uma referência para o local da foto de perfil no Firebase Storage
                const profilePicRef = storageRef(storage, `users/${userUid}.png`);
        
                // Fazer upload do novo arquivo
                const uploadTask = uploadBytesResumable(profilePicRef, file);
        
                // Monitore o progresso do upload
                uploadTask.on('state_changed',
                    (snapshot) => {
                        // Progresso do upload
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        console.log(`Upload está em ${progress}% completo`);
                    },
                    (error) => {
                        // Erro no upload
                        console.error('Erro no upload da foto de perfil:', error);
                    },
                    () => {
                        // Upload completo, agora obtemos o URL de download
                        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                            console.log('Foto de perfil atualizada! URL:', downloadURL);
        
                            // Atualiza a imagem de perfil na página com o novo URL
                            profilePicture.src = downloadURL;
        
                            // Aqui você pode salvar o novo URL no banco de dados se necessário
                        });
                    }
                );
            } catch (error) {
                console.error('Erro ao substituir a foto de perfil:', error);
            }
        }



        profilePicture.addEventListener('mousemove', (event) => {
            // Obtém as dimensões da imagem e a posição do mouse em relação a ela
            const { left, top, width, height } = profilePicture.getBoundingClientRect();
            const x = event.clientX - left;
            const y = event.clientY - top;
        
            // Calcula o quanto a imagem deve se inclinar com base na posição do mouse
            const moveX = ((x / width) - 0.5) * 20;  // Valor entre -10 e 10
            const moveY = ((y / height) - 0.5) * 20; // Valor entre -10 e 10
        
            // Aplica a transformação de inclinação
            profilePicture.style.transform = `scale(1.05) rotateX(${-moveY}deg) rotateY(${moveX}deg)`;
        });
        
        profilePicture.addEventListener('mouseleave', () => {
            // Reseta a transformação quando o mouse sair da imagem
            profilePicture.style.transform = 'scale(1)';
        });

        bioSaveBt.addEventListener("click", () => {
            update(ref(db, `users/enterprise/${userInfo.userUid}`), {
                bio: document.getElementById("bioInput").value
            });
        })


        async function displayUserBadges(userUid, badgesContainerElement) {
            try {
                // Referência ao usuário para acessar suas informações, incluindo as insígnias
                const userRef = ref(db, `users/enterprise/${userUid}`);
                const userSnapshot = await get(userRef);
        
                if (userSnapshot.exists()) {
                    const userData = userSnapshot.val();
                    const badges = userData.badges;
        
                    if (badges) {
                        const badgeIds = Object.keys(badges);
        
                        for (const badgeId of badgeIds) {
                            // Referência à insígnia para obter a imagem
                            console.log(`Buscando insígnia: ${badgeId}`);
                            const badgeRef = ref(db, `company/10001/badges/${badgeId}`);
                            const badgeSnapshot = await get(badgeRef);
        
                                const imageStorageRef = storageRef(storage, `company/10001/badges/${badgeId}.png`);
                                const imageDownloadUrl = await getDownloadURL(imageStorageRef);
        
                                // Criar um elemento de imagem e adicionar ao contêiner
                                const badgeImageElement = document.createElement('img');
                                badgeImageElement.src = imageDownloadUrl;
                                badgeImageElement.classList.add('badge-image');
        
                                badgesContainerElement.appendChild(badgeImageElement);
                            
                        }
                    } else {
                        console.log(`Usuário ${userUid} não possui insígnias.`);
                    }
                } else {
                    console.log(`Dados do usuário ${userUid} não encontrados.`);
                }
            } catch (error) {
                console.error("Erro ao buscar e exibir as insígnias do usuário:", error);
            }
        }
        
        displayUserBadges(userInfo.userUid, insigniasBox);
    })
    
}

document.getElementById('editButton').addEventListener('click', () => {
    const editMode = document.getElementById('editButton').classList.toggle('editing');
    const editableElements = document.querySelectorAll('.editable-text');

    editableElements.forEach(element => {
        if (editMode) {
            // Modo de edição: substitui texto por input
            const value = element.textContent.trim();
            const input = document.createElement('input');
            input.type = 'text';
            input.value = value;
            input.dataset.field = element.dataset.field;
            input.classList.add('edit-input');
            element.replaceWith(input);
        } else {
            // Modo de visualização: substitui input por texto
            const input = element;
            const value = input.value.trim();
            const p = document.createElement('p');
            p.textContent = value;
            p.dataset.field = input.dataset.field;
            p.classList.add('editable-text');
            input.replaceWith(p);
        }
    });

    // Mostrar ou ocultar o botão de salvar alterações
    document.getElementById('saveChangesButton').classList.toggle('hidden', !editMode);
});

// Salvando as alterações no banco de dados
document.getElementById('saveChangesButton').addEventListener('click', () => {
    const updatedUserData = {};
    document.querySelectorAll('.edit-input').forEach(input => {
        updatedUserData[input.dataset.field] = input.value.trim();
    });

    // Exemplo: Atualizar no banco de dados
    update(ref(db, `users/enterprise/${userID}`), updatedUserData)
        .then(() => {
            alert('Informações atualizadas com sucesso!');
            document.getElementById('editButton').click(); // Sai do modo de edição
        })
        .catch((error) => {
            console.error("Erro ao atualizar as informações: ", error);
            alert('Erro ao salvar alterações. Tente novamente mais tarde.');
        });
});






