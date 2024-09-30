const { initializeApp, cert } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const moment = require('moment'); // Biblioteca para manipulação de datas

var serviceAccount = require("./bc-another-test-firebase-adminsdk-l85sv-7b06c4a566.json");

initializeApp({
    credential: cert(serviceAccount),
    databaseURL: "https://bc-another-test-default-rtdb.firebaseio.com"
});

const db = getDatabase();

db.ref('users/normal').once('value', (snapshot) => {
    if (snapshot.exists()) {
        console.log("Dados iniciais obtidos de 'users/normal':", snapshot.val());

        snapshot.forEach((userSnapshot) => {
            const userId = userSnapshot.key;
            const birthDay = userSnapshot.val().birthDay;

            if (birthDay) {
                const userAge = moment().diff(moment(birthDay, "DD/MM/YYYY"), 'years');

                console.log(`userAge do usuário ${userId}: ${userAge} anos`);

                // Agora você pode usar a variável `userAge` conforme necessário
                const gameplayData = userSnapshot.val().gamePlay;
                if (gameplayData && gameplayData.game && gameplayData.scene && gameplayData.HRF) {
                    var gameName = gameplayData.game;
                    var scene = gameplayData.scene;

                    console.log(`Usuário: ${userId}, Jogo: ${gameName}, Cena: ${scene}, HRF: `);

                    db.ref(`users/normal/${userId}/gamePlay/scene`).on('value', (sceneSnapshot) => {
                        const newScene = sceneSnapshot.val();
                        if (newScene && newScene !== scene) {
                            scene = newScene;
                            console.log(`Cena alterada para: ${newScene}`);
                            db.ref(`users/normal/${userId}/gamePlay/HRF`).once('value').then(hrfSnapshot => {
                                var HRFValue = hrfSnapshot.val();
                                updateHRFInCompany(gameName, newScene, HRFValue, userAge);
                            });                            
                        }
                    });
                } else {
                    console.log(`Dados incompletos ou inexistentes em 'gamePlay' para o usuário ${userId}`);
                }
            }
        });

    } else {
        console.log("Nenhum dado encontrado em 'users/normal'. Verifique se o caminho está correto.");
    }
});

function updateHRFInCompany(gameName, scene, HRFValue, userAge) {
    const companiesRef = db.ref('company');

    //acahr jogo em alguma empresa cad
    companiesRef.once('value', (companiesSnapshot) => {
        if (!companiesSnapshot.exists()) {
            console.log("Nenhuma empresa encontrada no banco de dados.");
            return;
        }

        console.log("Atualizando HRF nas empresas correspondentes...");

        companiesSnapshot.forEach((companySnapshot) => {
            const companyData = companySnapshot.val();

            if (companyData.games && companyData.games[gameName] && companyData.games[gameName][scene]) {
                const sceneRef = db.ref(`company/${companySnapshot.key}/games/${gameName}/${scene}`);
            
                // Atualiza HRF para cada userAge
                console.log(`Inserindo ${HRFValue} em company/${companySnapshot.key}/games/${gameName}/${scene}`);
            
                let ageGroupKey;
            
                switch (true) {
                    case (userAge >= 0 && userAge <= 14):
                        ageGroupKey = '14-';
                        break;
                    case (userAge >= 15 && userAge <= 17):
                        ageGroupKey = '15-17';
                        break;
                    case (userAge >= 18 && userAge <= 24):
                        ageGroupKey = '18-24';
                        break;
                    case (userAge >= 25 && userAge <= 39):
                        ageGroupKey = '25-39';
                        break;
                    case (userAge >= 40 && userAge <= 59):
                        ageGroupKey = '40-59';
                        break;
                    default:
                        ageGroupKey = '60+';
                }
            
                // Usa uma transação para garantir a atomicidade da operação
                sceneRef.child(ageGroupKey).transaction((currentData) => {
                    console.log(currentData)
                    console.log(HRFValue)
                    console.log((currentData + HRFValue ) / 2)
                    if (currentData === null) {
                        // Se não houver dado atual, simplesmente define HRFValue
                        return HRFValue;
                    } else if (currentData == 0) {
                        // Caso contrário, calcula a média do valor existente com o novo HRFValue
                        return HRFValue;
                    } else if (typeof currentData === 'number' && !isNaN(currentData)) {
                        //caso nao tenha nenhum dado ainda 
                        return (currentData + HRFValue) / 2;
                    } else {
                        // Caso os dados atuais não sejam válidos, retorna o novo valor
                        console.warn(`Valor inválido encontrado: ${currentData}. Substituindo por ${HRFValue}.`);
                        return HRFValue;
                    }
                }, (error, committed, snapshot) => {
                    if (error) {
                        console.log('Erro na transação:', error);
                    } else if (!committed) {
                        console.log('Transação não foi comprometida.');
                    } else {
                        console.log(`HRF atualizado para a empresa ${companySnapshot.key}, faixa etária ${ageGroupKey}, com nova média: ${snapshot.val()}`);
                    }
                });
            } else {
                console.log(`Jogo ${gameName} ou cena ${scene} não encontrado na empresa ${companySnapshot.key}`);
            }
        });
    });
}
