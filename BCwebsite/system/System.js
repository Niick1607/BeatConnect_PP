import {
    checkUser,
    buscarUsuariosPorCompanyID,
    searchCompanyData,
    writeEnterpriseUserData,
    writeGameData,
    signIn,
    getValues,
    uploadImage,
    getImage
} from '../db/src/dataBase.js';

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

        body.style.backgroundImage = 'url(../testes/image.jpg)';
        body.style.backgroundSize = 'cover';
        body.style.backdropFilter = 'blur(15px)'
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
            } else if (endOfThePath.includes(key)) {
                console.log(currentData[key])
                let average = calculateAverage(currentData[key]);
                averageHistory.push({ [key]: parseFloat(average.toFixed(1)) });

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
        } else if (typeof subNode === 'number') {
            total += subNode;
            count++;
        }
    }

    traverseCA(node);
    return count > 0 ? total / count : 0;
}

function cleanSystem(section, companyId) {
    let sectionList = [contentSection, loginSection, createEnterpriseUserSection, settingsSection];
    //limpar essa parte, usar so hash do link smm
    sectionList.forEach(element => {
        if (section !== element) {
            element.style.display = 'none';
        } else {
            element.style.display = 'flex';
            if (section === sectionList[0]) {
                updateView(companyId);
            } else if (section === createEnterpriseUserSection) {
                renderizarUsuarios(userListContainer, companyId);
            }
        }
        if (section == null) {
            let hash = window.location.hash.substring(1);
            switch(hash){
                case 'contentSection':
                    contentSection.style.display = 'flex';
                    updateView(companyId);
                    break;
                case 'usersSection':
                    createEnterpriseUserSection.style.display = 'flex';
                    renderizarUsuarios(userListContainer, companyId);
                    break;
                case 'loginSection':
                    createEnterpriseUserSection.style.display = 'flex';
                    break;
                default:
                    contentSection.style.display = 'flex';
                    updateView(companyId);
                    break;
            }
        }
    });
}

async function renderizarUsuarios(whereToAdd, companyID, pageSize = 14, lastVisibleUser = null) {
    whereToAdd.innerHTML = '';
    localStorage.setItem('userIdSelected', null);

    const { usersData, lastVisible } = await buscarUsuariosPorCompanyID(companyID, pageSize, lastVisibleUser);

    if (usersData.length === 0) {
        whereToAdd.innerHTML = '<p>No users found.</p>';
        return;
    }

    usersData.forEach(({ userID, userData }, index) => {
        if (index === 0) {
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
        }

        let userDiv = `
            <div class="userConsultReturnContainer">
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

        userConsultReturnContainer.addEventListener("click", () => {
            whereToAdd.innerHTML = '';
            localStorage.setItem('userIdSelected', userID);
            alert(userID)
            let userSelectedCard = `
                <div class="userSelectedConsultCard">
                    <div class="consultUserImgContainer">
                        <img src="${userData.imageUrl}" alt="">
                    </div>
                    <div class="userCardInfoContainer">
                        <div class="userCardInfo">
                            <h2>Name: ${userData.username}</h2>
                        </div>
                        <div class="userCardInfo">
                            <h2>Email: ${userData.email}</h2>
                        </div>
                        <div class="userCardInfo">
                            <h2>Department: ${userData.department}</h2>
                        </div>
                        <div class="userCardInfo">
                            <h2>Birth: ${userData.birthYear}</h2>
                        </div>
                        <div class="userCardInfo">
                            <h2>Time in company: 2y and 6months</h2>
                        </div>
                        <div class="userCardInfo">
                            <h2>UserID: ${userID}</h2>
                        </div>
                    </div>
                </div>
            `;
            whereToAdd.innerHTML = userSelectedCard;
        });
    });

    if (lastVisible) {
        let paginationDiv = document.createElement('div');
        paginationDiv.classList.add('pagination');

        if (usersData.length === pageSize) {
            let nextButton = document.createElement('button');
            nextButton.innerText = 'Next';
            nextButton.addEventListener('click', () => {
                renderizarUsuarios(whereToAdd, companyID, pageSize, lastVisible);
            });
            paginationDiv.appendChild(nextButton);
        }

        whereToAdd.appendChild(paginationDiv);
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
    contentSection.style.display = 'flex';
    systemNavContainer.innerHTML = systemNav;
    const systemBt = document.getElementById('systemBt');
    const usersBt = document.getElementById('usersBt');
    const settingsBt = document.getElementById('settingsBt');

    cleanSystem(null, companyDataVar.companyId);

    systemBt.addEventListener("click", function () {
        cleanSystem(contentSection, companyDataVar.companyId);
        addPath.innerHTML = '';
        let pathFirst = `company/${userList.companyCode}/games`;
    });
    usersBt.addEventListener("click", function () {
        window.location.hash = 'usersSection';
        cleanSystem(null, companyDataVar.companyId);
    });

    registerUserEnterpriseBt.addEventListener("click", () => {
        if (userNameEnterpriseRegister.value &&
            userEmailEnterpriseRegister.value && userDepartmentEnterpriseRegister.value &&
            userPasswordEnterpriseRegister.value &&
            userBirthDateRegister.value &&
            userConfirmPasswordEnterpriseRegister.value === userPasswordEnterpriseRegister.value) {
            writeEnterpriseUserData(userNameEnterpriseRegister.value, userEmailEnterpriseRegister.value, userDepartmentEnterpriseRegister.value, userPasswordEnterpriseRegister.value, 'BeatConnect', userList.companyCode, userBirthDateRegister.value);
            buscarUsuariosPorCompanyID(userList.companyCode, userListContainer);
        }
        userNameEnterpriseRegister.value = ''
        userEmailEnterpriseRegister.value = ''
        userPasswordEnterpriseRegister.value = ''
        userBirthDateRegister.value = ''
        userConfirmPasswordEnterpriseRegister.value = ''
        userPasswordEnterpriseRegister.value = ''
    });

    settingsBt.addEventListener("click", function () {
        window.location.hash = 'usersSection';
        cleanSystem(null, companyDataVar.companyId);
    });
    console.log(userList.userUid)
    getImage(`users/${userList.userUid}.png`).then(url => {
        const settingsConfig = `
            <div class="settingsContainer">
                <h1>Profile Settings</h1>
                <div class="profileSettingContainer">
                    <img src="${url}">
                    <div class="profileSettingsTextContent">
                        <h2>${userList.username}</h2>
                        <h2>${userList.email}</h2>
                        <h2>${userList.department}</h2>
                        <h2>${userList.userUid}</h2>
                    </div>
                </div>
            </div>
    `
        settingsSection.innerHTML = settingsConfig
    })
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

checkUser().then((result) => {
    if (result.status === 'log') {
        console.log(`Usuário logado com dados de autenticação: ${result.userAuthData.uid}`);
        console.log(`Dados do usuário do banco de dados: ${result.userData}`);
        const userInfo = result.userData;

        (async () => {
            try {
                const companyData = await searchCompanyData(userInfo.companyCode);
                userInfo.userUid = result.userAuthData.uid

                startSystem(userInfo, companyData);
            } catch (error) {
                console.error(`Error fetching company data: ${error}`);
            }
        })();

    } else {
        console.log('Usuário não está logado');
        loginSection.style.display = 'flex';
        let loginBt = document.getElementById('bt');

        let emailInput = document.getElementById('emailInput');
        let passwordInput = document.getElementById('passwordInput');
        let logIn = async () => {
            try {
                await signIn(emailInput.value, passwordInput.value);
                const result = await checkUser();
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
}).catch((error) => {
    console.error(`Erro ao verificar usuário: ${error}`);
});

