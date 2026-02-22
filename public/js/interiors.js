// Simple testimonial slider
document.addEventListener('DOMContentLoaded', function() {
    const testimonials = document.querySelectorAll('.testimonial-item');
    if (testimonials.length > 0) {
        // Show first testimonial
        testimonials[0].classList.add('active');
        
        // Create dots
        const slider = document.querySelector('.testimonial-slider');
        const dotsContainer = document.createElement('div');
        dotsContainer.className = 'testimonial-dots';
        
        testimonials.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.className = 'testimonial-dot';
            if (index === 0) dot.classList.add('active');
            dot.addEventListener('click', () => showTestimonial(index));
            dotsContainer.appendChild(dot);
        });
        
        slider.appendChild(dotsContainer);
        
        // Auto rotate
        let currentIndex = 0;
        setInterval(() => {
            currentIndex = (currentIndex + 1) % testimonials.length;
            showTestimonial(currentIndex);
        }, 5000);
        
        function showTestimonial(index) {
            testimonials.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.testimonial-dot').forEach(d => d.classList.remove('active'));
            
            testimonials[index].classList.add('active');
            document.querySelectorAll('.testimonial-dot')[index].classList.add('active');
        }
    }
});