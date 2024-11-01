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


document.addEventListener("DOMContentLoaded", function () {
    // Variáveis de configuração
    const scrollThreshold = 500; // Tempo limite (em ms) entre trocas de conteúdo (ex.: 1000 ms = 1 segundo)
    const scrollSensitivity = 30; // Sensibilidade mínima da rolagem (ex.: 30)
    const animationDuration = 600; // Duração da animação (em ms) para a transição de conteúdo (ex.: 600 ms)
  
    const sections = document.querySelectorAll(".infoSection .section-content");
    const infoSection = document.querySelector(".infoSection");
    let currentIndex = 0;
    let isScrolling = false;
    let lastScrollTime = 0;
  
    // Função para verificar se o usuário chegou ao final da seção
    function isSectionEndReached() {
      const sectionRect = infoSection.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
  
      // Verifica se o final da seção está visível na parte inferior do viewport
      return sectionRect.bottom <= viewportHeight;
    }
  
    function throttleScroll(event) {
      const currentTime = Date.now();
  
      // Verifica se o final da seção está visível e se o tempo limite foi respeitado
      if (!isSectionEndReached() || isScrolling || (currentTime - lastScrollTime) < scrollThreshold) return;
  
      const direction = event.deltaY > scrollSensitivity ? 1 : event.deltaY < -scrollSensitivity ? -1 : 0;
  
      // Se a rolagem for muito leve, não faz nada
      if (direction === 0) return;
  
      // Atualiza a variável para controlar a rolagem
      isScrolling = true;
      lastScrollTime = currentTime; // Atualiza o último horário de rolagem
  
      const nextIndex = (currentIndex + direction + sections.length) % sections.length;
  
      // Define a direção de saída do conteúdo atual
      sections[currentIndex].classList.add(direction > 0 ? "exiting-up" : "exiting-down");
  
      setTimeout(() => {
        sections[currentIndex].classList.remove("active", "exiting-up", "exiting-down");
        currentIndex = nextIndex;
        sections[currentIndex].classList.add("active");
        isScrolling = false;
      }, animationDuration); // Usa a duração da animação configurada
    }
  
    // Ativa o primeiro conteúdo ao carregar a página
    sections[currentIndex].classList.add("active");
  
    // Escuta o evento de rolagem na seção específica
    infoSection.addEventListener("wheel", throttleScroll, { passive: false });
  });
  