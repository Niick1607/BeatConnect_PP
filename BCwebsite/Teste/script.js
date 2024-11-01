// Parallax Effect on Scroll
document.addEventListener('scroll', function() {
    const layers = document.querySelectorAll('.parallax-layer');
    layers.forEach(layer => {
        const speed = layer.getAttribute('data-speed');
        const yPos = window.scrollY * speed;
        layer.style.transform = `translateY(${yPos}px)`;
    });
});
