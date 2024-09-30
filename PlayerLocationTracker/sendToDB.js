const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword, signOut } = require("firebase/auth");
const { getDatabase, ref, update, get } = require("firebase/database");

const firebaseConfig = {
    apiKey: "AIzaSyALeHXf9CVu9B5s99sYjmMirhoJ5tK4PY0",
    authDomain: "bc-another-test.firebaseapp.com",
    databaseURL: "https://bc-another-test-default-rtdb.firebaseio.com/",
    projectId: "bc-another-test",
    storageBucket: "bc-another-test.appspot.com",
    messagingSenderId: "760177891607",
    appId: "1:760177891607:web:bf4afe36b0f8684fddff52",
    measurementId: "G-ZRGFH2W0K9"
};
const email = 'nick.servylab@gmail.com';
const password = '!NormalUserTest';

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const fs = require('fs');
var lastKnownLine = '';

signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
        const user = userCredential.user;
        console.log('Usuário está logado:', user);
        const userUid = user.uid;
        function sendLastLineToFirebase(lineContent) {
    
            
            update(ref(db, `users/normal/${userUid}/gamePlay`), {
                game: "Terraria",
                scene: lineContent
            }).catch((error) => {
                console.error("Erro ao enviar a última linha para o Firebase: ", error);
            });
        }

        function readLastLine(filePath) {
            const data = fs.readFileSync(filePath, 'utf8');

            const lines = data.split('\n');

            return lines[lines.length - 2];
        }

        function monitorFile(filePath) {
            fs.watch(filePath, (eventType, filename) => {
                if (eventType === 'change') {
                    const lastLine = readLastLine(filePath);
                    if (lastLine !== lastKnownLine) {
                        lastKnownLine = lastLine;
                        sendLastLineToFirebase(lastLine);
                    }
                }
            });
        }

        const filePath = '../../PlayerLocationData/PlayerLocationData.txt';
        lastKnownLine = readLastLine(filePath);
        // sendLastLineToFirebase(lastKnownLine);
        monitorFile(filePath);
        
        // setTimeout(() => {
        //     setInterval(() => {
        //     update(ref(db, `users/normal/${userUid}/gamePlay`), {
        //         HRF: Math.floor(Math.random() * (70 - 60 + 1)) + 60
        //     }).catch((error) => {
        //         console.error("Erro ao enviar HRF para o Firebase: ", error);
        //     });
        // }, 5000);
        // }, 7000);
        

    })
    .catch((error) => {
        console.error('Erro ao autenticar ou obter dados do usuário:', error);
    });

