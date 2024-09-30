document.addEventListener("DOMContentLoaded", function () {
    const addCards = document.querySelector(".cards-container");
    const cardsContent = [
        {
            title: "keep calm and don't be suspicious",
            description: "stay calm, don't look suspicious to avoid attracting the attention of the cops"
        },
        {
            title: "keep calm and don't be suspicious",
            description: "don't get any nervous, it may not see you, but it hears every beat of your heart"
        },
        {
            title: "the perfect moment",
            description: "lorem ipsum dolor sit amet consectetur velit, sunt consecte"
        },
        {
            title: "Hear disease? No problem! ",
            description: "We adapt the game exclusive for your needs!"
        }
    ];

    (function () {
        for (let i = 0; i < cardsContent.length; i++) {
            const card = `
        <input type="radio" name="slide" id="c${i+1}" checked>
                <label for="c${i+1}" class="card">
                    <div class="row">
                        <div class="icon">${i+1}</div>
                        <div class="description">
                            <h4>${cardsContent[i].title}</h4>
                            <p>${cardsContent[i].description}</p>
                        </div>
                    </div>
                </label>
        `;
            addCards.innerHTML += card;
        };
    })();
});

