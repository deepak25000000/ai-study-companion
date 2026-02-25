// ==================== QUANTUM PARTICLE FIELD ====================
class QuantumParticleField {
    constructor() {
        // Replace the div with a real canvas
        const placeholder = document.getElementById('particle-canvas');
        if (!placeholder) return;

        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particle-canvas-real';
        // Copy the styles from CSS applied to #particle-canvas
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.zIndex = '0';
        this.canvas.style.pointerEvents = 'none';
        placeholder.parentNode.replaceChild(this.canvas, placeholder);

        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;

        this.init();
        this.animate();
        this.addEventListeners();
    }

    init() {
        this.resize();
        this.createParticles();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        const count = Math.min(80, Math.floor(window.innerWidth / 15));
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 2 + 0.5,
                speedX: (Math.random() - 0.5) * 0.4,
                speedY: (Math.random() - 0.5) * 0.4,
                opacity: Math.random() * 0.25 + 0.05,
                color: this.randomColor()
            });
        }
    }

    randomColor() {
        const c = ['rgba(110,58,255,', 'rgba(42,125,225,', 'rgba(15,244,230,', 'rgba(0,255,157,'];
        return c[Math.floor(Math.random() * c.length)];
    }

    addEventListeners() {
        window.addEventListener('resize', () => this.resize());
        window.addEventListener('mousemove', (e) => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.lineWidth = 0.5;

        // Connections
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 140) {
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(110,58,255,${0.02 * (1 - dist / 140)})`;
                    this.ctx.stroke();
                }
            }
        }

        this.particles.forEach(p => {
            const dx = this.mouseX - p.x, dy = this.mouseY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
                const a = Math.atan2(dy, dx), f = (100 - dist) / 1000;
                p.x -= Math.cos(a) * f;
                p.y -= Math.sin(a) * f;
            }
            p.x += p.speedX; p.y += p.speedY;
            if (p.x < 0) p.x = this.canvas.width;
            if (p.x > this.canvas.width) p.x = 0;
            if (p.y < 0) p.y = this.canvas.height;
            if (p.y > this.canvas.height) p.y = 0;

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color + p.opacity + ')';
            this.ctx.fill();
        });

        requestAnimationFrame(() => this.animate());
    }
}

// ==================== GSAP ENTRANCE ANIMATIONS ====================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize particle background
    new QuantumParticleField();

    // GSAP entrance animations (only if gsap is loaded)
    if (typeof gsap !== 'undefined') {
        gsap.from('.quantum-logo', { duration: 1, y: -50, opacity: 0, ease: 'power3.out' });
        gsap.from('.mode-grid .cosmic-mode', { duration: 0.8, y: 30, opacity: 0, stagger: 0.1, ease: 'back.out(1.7)', delay: 0.3 });
        gsap.from('.welcome-portal', { duration: 1.2, scale: 0.8, opacity: 0, ease: 'elastic.out(1, 0.5)' });

        document.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            gsap.to('.portal-ring', { duration: 1, x, y, ease: 'power2.out' });
        });
    }
});
