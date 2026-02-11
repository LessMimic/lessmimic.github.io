window.HELP_IMPROVE_VIDEOJS = false;

// More Works Dropdown Functionality
function toggleMoreWorks() {
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    if (!dropdown || !button) return;
    
    if (dropdown.classList.contains('show')) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
    } else {
        dropdown.classList.add('show');
        button.classList.add('active');
        button.setAttribute('aria-expanded', 'true');
    }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const container = document.querySelector('.more-works-container');
    const dropdown = document.getElementById('moreWorksDropdown');
    const button = document.querySelector('.more-works-btn');
    
    if (container && dropdown && button && !container.contains(event.target)) {
        dropdown.classList.remove('show');
        button.classList.remove('active');
        button.setAttribute('aria-expanded', 'false');
    }
});

// Close dropdown on escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const dropdown = document.getElementById('moreWorksDropdown');
        const button = document.querySelector('.more-works-btn');
        if (dropdown && button) {
            dropdown.classList.remove('show');
            button.classList.remove('active');
            button.setAttribute('aria-expanded', 'false');
        }
    }
});

// Copy BibTeX to clipboard
function copyBibTeX() {
    const bibtexElement = document.getElementById('bibtex-code');
    const button = document.querySelector('.copy-bibtex-btn');
    if (!bibtexElement || !button) return;
    const copyText = button.querySelector('.copy-text');
    if (!copyText) return;
    
    navigator.clipboard.writeText(bibtexElement.textContent).then(function() {
        button.classList.add('copied');
        copyText.textContent = 'Copied';
        
        setTimeout(function() {
            button.classList.remove('copied');
            copyText.textContent = 'Copy';
        }, 2000);
    }).catch(function(err) {
        console.error('Failed to copy: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = bibtexElement.textContent;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        button.classList.add('copied');
        copyText.textContent = 'Copied';
        setTimeout(function() {
            button.classList.remove('copied');
            copyText.textContent = 'Copy';
        }, 2000);
    });
}

// Scroll to top functionality
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Show/hide scroll to top button
window.addEventListener('scroll', function() {
    const scrollButton = document.querySelector('.scroll-to-top');
    if (!scrollButton) return;
    if (window.pageYOffset > 300) {
        scrollButton.classList.add('visible');
    } else {
        scrollButton.classList.remove('visible');
    }
});

// Video carousel autoplay when in view
var carouselObserver = null;

function setupVideoCarouselAutoplay() {
    const carouselVideos = document.querySelectorAll('.results-carousel video');

    if (carouselVideos.length === 0) return;
    if (!('IntersectionObserver' in window)) return;

    carouselObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const video = entry.target;
            if (entry.isIntersecting) {
                // Video is in view, play it
                video.play().catch(e => {
                    // Autoplay failed, probably due to browser policy
                    console.log('Autoplay prevented:', e);
                });
            } else {
                // Video is out of view, pause it
                video.pause();
            }
        });
    }, {
        threshold: 0.5 // Trigger when 50% of the video is visible
    });

    carouselVideos.forEach(video => {
        carouselObserver.observe(video);
    });
}

function autoplayDemoVideos() {
    var videos = document.querySelectorAll('.how-section video, .demo-section video');
    videos.forEach(function(video) {
        video.muted = true;
        video.autoplay = true;
        var tryPlay = function() {
            video.play().catch(function() {});
        };
        if (video.readyState >= 2) {
            tryPlay();
        } else {
            video.addEventListener('loadeddata', tryPlay, { once: true });
        }
    });
}

function setVideoSource(videoElement, sourceUrl) {
    if (!videoElement || !sourceUrl) return;
    var sourceEl = videoElement.querySelector('source');
    if (!sourceEl) {
        sourceEl = document.createElement('source');
        sourceEl.type = 'video/mp4';
        videoElement.appendChild(sourceEl);
    }
    sourceEl.src = sourceUrl;
    videoElement.load();
}

function activateTab(container, activeButton) {
    if (!container || !activeButton) return;
    container.querySelectorAll('.demo-tab').forEach(function(button) {
        button.classList.remove('active');
        button.setAttribute('aria-selected', 'false');
    });
    activeButton.classList.add('active');
    activeButton.setAttribute('aria-selected', 'true');
}

function setupSingleVideoTabs(containerId, videoId, labelId) {
    var container = document.getElementById(containerId);
    var video = document.getElementById(videoId);
    var labelEl = document.getElementById(labelId);
    if (!container || !video || !labelEl) return;

    container.querySelectorAll('.demo-tab').forEach(function(button) {
        button.addEventListener('click', function() {
            var src = button.getAttribute('data-video');
            var label = button.getAttribute('data-label');
            if (!src) return;
            activateTab(container, button);
            setVideoSource(video, src);
            video.play().catch(function() {});
            if (label) {
                labelEl.textContent = label;
            }
        });
    });
}

function setupDualVideoTabs(containerId, videoAId, videoBId) {
    var container = document.getElementById(containerId);
    var videoA = document.getElementById(videoAId);
    var videoB = document.getElementById(videoBId);
    if (!container || !videoA || !videoB) return;

    container.querySelectorAll('.demo-tab').forEach(function(button) {
        button.addEventListener('click', function() {
            var sourceA = button.getAttribute('data-mocap');
            var sourceB = button.getAttribute('data-depth');
            if (!sourceA || !sourceB) return;
            activateTab(container, button);
            setVideoSource(videoA, sourceA);
            setVideoSource(videoB, sourceB);
            videoA.play().catch(function() {});
            videoB.play().catch(function() {});
        });
    });
}

function setupContributionCards() {
    var cards = document.querySelectorAll('.contribution-card');
    if (!cards.length) return;

    function setActiveCard(activeCard) {
        cards.forEach(function(card) {
            card.classList.toggle('is-active', card === activeCard);
        });
    }

    function setExpandedCard(expandedCard) {
        cards.forEach(function(card) {
            var isExpanded = card === expandedCard;
            card.classList.toggle('is-expanded', isExpanded);
            card.setAttribute('aria-expanded', String(isExpanded));
        });
    }

    cards.forEach(function(card, index) {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-pressed', 'false');
        card.setAttribute('aria-expanded', 'false');
        card.addEventListener('mouseenter', function() {
            setActiveCard(card);
        });
        card.addEventListener('click', function() {
            var shouldExpand = !card.classList.contains('is-expanded');
            setActiveCard(card);
            setExpandedCard(shouldExpand ? card : null);
            cards.forEach(function(node) {
                node.setAttribute('aria-pressed', String(node === card));
            });
        });
        card.addEventListener('focus', function() {
            setActiveCard(card);
        });
        card.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                var shouldExpand = !card.classList.contains('is-expanded');
                setActiveCard(card);
                setExpandedCard(shouldExpand ? card : null);
                cards.forEach(function(node) {
                    node.setAttribute('aria-pressed', String(node === card));
                });
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                event.preventDefault();
                cards[(index + 1) % cards.length].focus();
            }
            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                event.preventDefault();
                cards[(index - 1 + cards.length) % cards.length].focus();
            }
            if (event.key === 'Escape') {
                setExpandedCard(null);
            }
        });
    });

    setActiveCard(cards[0]);
    setExpandedCard(cards[0]);

    document.addEventListener('click', function(event) {
        var clickedCard = event.target.closest('.contribution-card');
        if (!clickedCard) {
            setExpandedCard(null);
        }
    });
}

function pauseAllVideos() {
    document.querySelectorAll('video').forEach(function(v) {
        v.pause();
        v.autoplay = false;
    });
    if (carouselObserver) carouselObserver.disconnect();
}

function resumeAllVideos() {
    // Re-observe carousel videos
    if (carouselObserver) {
        document.querySelectorAll('.results-carousel video').forEach(function(video) {
            carouselObserver.observe(video);
        });
    }
    autoplayDemoVideos();
}

function setupMujocoSessionLauncher() {
    var section = document.querySelector('.mujoco-session-section');
    var frameWrap = document.querySelector('.mujoco-session-frame-wrap');
    var startButton = document.getElementById('start-mujoco-btn');
    var iframe = document.getElementById('mujoco-session-frame');
    var closeButton = document.getElementById('close-mujoco-btn');
    var phoneDisabledNote = document.getElementById('mujoco-session-disabled-note');
    if (!section || !frameWrap || !startButton || !iframe) return;

    var isPhoneViewport = window.matchMedia('(max-width: 767px)').matches;
    if (isPhoneViewport) {
        section.classList.add('is-phone-disabled');
        startButton.disabled = true;
        startButton.setAttribute('aria-disabled', 'true');
        if (phoneDisabledNote) {
            phoneDisabledNote.hidden = false;
        }
        return;
    }

    startButton.addEventListener('click', function() {
        var iframeSrc = iframe.getAttribute('data-src');
        if (!iframeSrc) return;

        pauseAllVideos();

        iframe.src = iframeSrc;
        frameWrap.classList.add('is-started');
        startButton.disabled = true;
        startButton.setAttribute('aria-disabled', 'true');
        startButton.textContent = 'Session Running';
        if (closeButton) closeButton.hidden = false;
    });

    if (closeButton) {
        closeButton.addEventListener('click', function() {
            // Signal iframe to clean up resources before tearing down
            try { iframe.contentWindow.postMessage({ type: 'df-act-close' }, '*'); } catch(e) {}
            // Brief delay for cleanup, then tear down
            setTimeout(function() {
                iframe.src = 'about:blank';
                frameWrap.classList.remove('is-started');
                startButton.disabled = false;
                startButton.removeAttribute('aria-disabled');
                startButton.textContent = 'Start Live MuJoCo Session';
                closeButton.hidden = true;
                resumeAllVideos();
            }, 150);
        });
    }
}

function setupOutlinePanel() {
    var outlineLinks = Array.from(document.querySelectorAll('.outline-panel .outline-link[data-outline-link]'));
    if (!outlineLinks.length) return;

    var sectionEntries = outlineLinks
        .map(function(link) {
            var id = link.getAttribute('data-outline-link');
            var section = id ? document.getElementById(id) : null;
            return section ? { id: id, section: section } : null;
        })
        .filter(Boolean);
    if (!sectionEntries.length) return;

    function setActiveLink(id) {
        outlineLinks.forEach(function(link) {
            var isActive = link.getAttribute('data-outline-link') === id;
            link.classList.toggle('active', isActive);
            link.setAttribute('aria-current', isActive ? 'true' : 'false');
        });
    }

    function updateActiveFromScroll() {
        // Track the section that has crossed a stable anchor point.
        var anchorY = window.innerHeight * 0.32;
        var activeId = sectionEntries[0].id;

        for (var i = 0; i < sectionEntries.length; i += 1) {
            var item = sectionEntries[i];
            var top = item.section.getBoundingClientRect().top;
            if (top <= anchorY) {
                activeId = item.id;
            } else {
                break;
            }
        }

        setActiveLink(activeId);
    }

    window.addEventListener('scroll', updateActiveFromScroll, { passive: true });
    window.addEventListener('resize', updateActiveFromScroll);

    updateActiveFromScroll();
}

document.addEventListener('DOMContentLoaded', function() {
    var options = {
        slidesToScroll: 1,
        slidesToShow: 1,
        loop: true,
        infinite: true,
        autoplay: true,
        autoplaySpeed: 5000
    };

    if (window.bulmaCarousel && typeof window.bulmaCarousel.attach === 'function') {
        window.bulmaCarousel.attach('.carousel', options);
    }
    if (window.bulmaSlider && typeof window.bulmaSlider.attach === 'function') {
        window.bulmaSlider.attach();
    }

    // Core interactions first (must work even if optional features fail).
    setupSingleVideoTabs('demo-tabs-generalization', 'demo-video-generalization', 'demo-label-generalization');
    setupSingleVideoTabs('demo-tabs-longhorizon', 'demo-video-longhorizon', 'demo-label-longhorizon');
    setupSingleVideoTabs('demo-tabs-recovery', 'demo-video-recovery', 'demo-label-recovery');
    setupDualVideoTabs('demo-tabs-perception', 'demo-video-mocap', 'demo-video-depth');
    setupContributionCards();
    setupMujocoSessionLauncher();
    setupOutlinePanel();
    autoplayDemoVideos();

    // Non-critical enhancements are isolated so they cannot block button behavior.
    try {
        setupVideoCarouselAutoplay();
    } catch (error) {
        console.warn('Video carousel autoplay enhancement disabled:', error);
    }
});
