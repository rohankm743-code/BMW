/**
 * BMW M4 Competition — Interactive 3D Smooth-Scroll Experience
 * Core Engine: Lenis Smooth Scroll + GSAP ScrollTrigger + Canvas Frame Scrubber
 */

document.addEventListener('DOMContentLoaded', () => {

  // =========================================================================
  // 1. ASSET CONFIGURATION & FRAME MANIFEST
  // =========================================================================
  
  // Base paths for exploded video frames
  const FRAME_BASE_PATH = 'video-frames/Car_parts_separating_into_diagram_20260919221813_frames/';
  const FALLBACK_BASE_PATH = 'video-frames/';

  // Discovered frame file names (90 actual frames from frame_001 to frame_093)
  const FRAME_NAMES = [
    'frame_001.jpg', 'frame_002.jpg', 'frame_003.jpg', 'frame_004.jpg', 'frame_005.jpg',
    'frame_006.jpg', 'frame_007.jpg', 'frame_008.jpg', 'frame_009.jpg', 'frame_010.jpg',
    'frame_011.jpg', 'frame_012.jpg', 'frame_013.jpg', 'frame_014.jpg', 'frame_015.jpg',
    'frame_016.jpg', 'frame_017.jpg', 'frame_018.jpg', 'frame_019.jpg', 'frame_020.jpg',
    'frame_021.jpg', 'frame_022.jpg', 'frame_023.jpg', 'frame_024.jpg', 'frame_025.jpg',
    'frame_026.jpg', 'frame_027.jpg', 'frame_028.jpg', 'frame_029.jpg', 'frame_030.jpg',
    'frame_031.jpg', 'frame_032.jpg', 'frame_033.jpg', 'frame_034.jpg', 'frame_035.jpg',
    'frame_036.jpg', 'frame_037.jpg', 'frame_038.jpg', 'frame_039.jpg', 'frame_040.jpg',
    'frame_041.jpg', 'frame_042.jpg', 'frame_043.jpg', 'frame_044.jpg', 'frame_045.jpg',
    'frame_046.jpg', 'frame_047.jpg', 'frame_048.jpg', 'frame_049.jpg', 'frame_050.jpg',
    'frame_051.jpg', 'frame_052.jpg', 'frame_053.jpg', 'frame_054.jpg', 'frame_055.jpg',
    'frame_056.jpg', 'frame_057.jpg', 'frame_058.jpg', 'frame_059.jpg', 'frame_060.jpg',
    'frame_061.jpg', 'frame_062.jpg', 'frame_063.jpg', 'frame_064.jpg', 'frame_065.jpg',
    'frame_066.jpg', 'frame_067.jpg', 'frame_068.jpg', 'frame_069.jpg', 'frame_070.jpg',
    'frame_071.jpg', 'frame_072.jpg', 'frame_073.jpg', 'frame_074.jpg', 'frame_075.jpg',
    'frame_076.jpg', 'frame_077.jpg', 'frame_078.jpg', 'frame_079.jpg', 'frame_080.jpg',
    'frame_081.jpg', 'frame_082.jpg', 'frame_083.jpg', 'frame_084.jpg', 'frame_085.jpg',
    'frame_086.jpg', 'frame_087.jpg', 'frame_088.jpg', 'frame_091.jpg', 'frame_093.jpg'
  ];

  const TOTAL_FRAMES = FRAME_NAMES.length;
  const frameImages = new Array(TOTAL_FRAMES).fill(null);
  let framesLoadedCount = 0;
  let isPreloaderDismissed = false;

  // DOM Elements
  const preloader = document.getElementById('preloader');
  const preloaderFill = document.getElementById('preloader-fill');
  const preloaderPercent = document.getElementById('preloader-percent');
  const preloaderStatus = document.getElementById('preloader-status');
  
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const hudFrameNum = document.getElementById('hud-frame-num');
  const heroProgressThumb = document.getElementById('hero-progress-thumb');

  // Stages
  const stage0 = document.getElementById('stage-0');
  const stage1 = document.getElementById('stage-1');
  const stage2 = document.getElementById('stage-2');
  const stage3 = document.getElementById('stage-3');

  // Frame Scrubbing State
  let targetFrameIndex = 0;
  let currentInterpolatedFrame = 0;
  let lastDrawnFrameIndex = -1;
  let isMobile = window.innerWidth <= 768;

  // =========================================================================
  // 2. LENIS SMOOTH SCROLL INTEGRATION WITH GSAP
  // =========================================================================
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    lerp: 0.08,
    smoothWheel: true,
    wheelMultiplier: 1.0,
    touchMultiplier: 1.2,
    infinite: false,
  });

  // Synchronize Lenis with GSAP ScrollTrigger
  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });
  gsap.ticker.lagSmoothing(0);

  // =========================================================================
  // 3. CANVAS HiDPI RESIZING & DRAWING LOGIC
  // =========================================================================
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    const displayWidth = window.innerWidth;
    const displayHeight = window.innerHeight;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    // Force redraw of current frame
    if (lastDrawnFrameIndex >= 0) {
      renderFrame(lastDrawnFrameIndex, true);
    }
  }

  window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    resizeCanvas();
  });
  resizeCanvas();

  /**
   * Draw an image to the canvas using object-fit: cover with centering
   */
  function drawImageProp(ctx, img) {
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;

    // Clear canvas background to deep black
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, cw, ch);

    // Calculate aspect ratio cover with subpixel centering
    const scale = Math.max(cw / nw, ch / nh);
    const sw = nw * scale;
    const sh = nh * scale;
    const dx = (cw - sw) / 2;
    const dy = (ch - sh) / 2;

    ctx.drawImage(img, 0, 0, nw, nh, dx, dy, sw, sh);
  }

  /**
   * Render frame at given index with fallback to nearest loaded frame
   */
  function renderFrame(index, force = false) {
    const clampedIndex = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(index)));
    
    if (!force && clampedIndex === lastDrawnFrameIndex) return;

    let imgToDraw = frameImages[clampedIndex];

    // If target frame isn't loaded yet, find nearest available frame
    if (!imgToDraw || !imgToDraw.complete || imgToDraw.naturalWidth === 0) {
      let offset = 1;
      while (offset < TOTAL_FRAMES) {
        if (clampedIndex - offset >= 0 && frameImages[clampedIndex - offset]?.complete && frameImages[clampedIndex - offset]?.naturalWidth > 0) {
          imgToDraw = frameImages[clampedIndex - offset];
          break;
        }
        if (clampedIndex + offset < TOTAL_FRAMES && frameImages[clampedIndex + offset]?.complete && frameImages[clampedIndex + offset]?.naturalWidth > 0) {
          imgToDraw = frameImages[clampedIndex + offset];
          break;
        }
        offset++;
      }
    }

    if (imgToDraw && imgToDraw.complete && imgToDraw.naturalWidth > 0) {
      drawImageProp(ctx, imgToDraw);
      lastDrawnFrameIndex = clampedIndex;

      // Update HUD frame number
      if (hudFrameNum) {
        const frameDisplay = String(clampedIndex + 1).padStart(3, '0');
        hudFrameNum.textContent = frameDisplay;
      }
    }
  }

  // =========================================================================
  // 4. PROGRESSIVE PRELOADER WITH CHUNK STREAMING
  // =========================================================================
  function loadSingleFrame(index) {
    return new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        frameImages[index] = img;
        framesLoadedCount++;
        onFrameLoaded(index);
        resolve(img);
      };

      img.onerror = () => {
        // Try fallback path if main path failed
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          frameImages[index] = fallbackImg;
          framesLoadedCount++;
          onFrameLoaded(index);
          resolve(fallbackImg);
        };
        fallbackImg.onerror = () => {
          console.warn(`[BMW M4] Frame ${index} failed to load: ${FRAME_NAMES[index]}`);
          resolve(null);
        };
        fallbackImg.src = FALLBACK_BASE_PATH + FRAME_NAMES[index];
      };

      img.src = FRAME_BASE_PATH + FRAME_NAMES[index];
    });
  }

  function onFrameLoaded(index) {
    // If it's the very first frame, paint immediately!
    if (index === 0 && lastDrawnFrameIndex === -1) {
      renderFrame(0, true);
    }

    // Update preloader UI
    const progressPercent = Math.round((framesLoadedCount / TOTAL_FRAMES) * 100);
    if (preloaderPercent) preloaderPercent.textContent = `${String(progressPercent).padStart(2, '0')}%`;
    if (preloaderFill) preloaderFill.style.width = `${progressPercent}%`;

    // Dismiss preloader when >= 35% buffered for instant interaction
    if (!isPreloaderDismissed && (progressPercent >= 35 || framesLoadedCount >= 32)) {
      dismissPreloader();
    }
  }

  function dismissPreloader() {
    if (isPreloaderDismissed) return;
    isPreloaderDismissed = true;

    if (preloaderStatus) preloaderStatus.textContent = 'SYSTEM READY // INITIATING';
    
    // Ensure frame 0 is painted before preloader fades
    renderFrame(0, true);

    gsap.to(preloader, {
      opacity: 0,
      duration: 0.7,
      ease: 'power2.out',
      onComplete: () => {
        preloader.classList.add('loaded');
        // Initial intro reveal
        initHeroStage0();
      }
    });
  }

  async function startProgressiveLoading() {
    // Phase 1: Load first 10 frames with high priority for immediate first paint
    const priorityCount = isMobile ? 6 : 12;
    const priorityPromises = [];
    for (let i = 0; i < priorityCount; i++) {
      priorityPromises.push(loadSingleFrame(i));
    }
    await Promise.all(priorityPromises);

    // Initial render once priority frames land
    renderFrame(0, true);

    // Phase 2: Stream remaining frames in concurrent background batches
    const batchSize = isMobile ? 4 : 8;
    for (let i = priorityCount; i < TOTAL_FRAMES; i += batchSize) {
      const batchPromises = [];
      for (let j = i; j < Math.min(i + batchSize, TOTAL_FRAMES); j++) {
        batchPromises.push(loadSingleFrame(j));
      }
      await Promise.all(batchPromises);
    }

    // Fully loaded
    if (!isPreloaderDismissed) {
      dismissPreloader();
    }
  }

  // =========================================================================
  // 5. SMOOTH INTERPOLATION TICKER (Apple AirPods Style)
  // =========================================================================
  function frameScrubberLoop() {
    // Smooth interpolation with damping
    const delta = targetFrameIndex - currentInterpolatedFrame;
    if (Math.abs(delta) > 0.001) {
      currentInterpolatedFrame += delta * 0.18; // Butter-smooth lerp factor
      renderFrame(currentInterpolatedFrame);
    }
    requestAnimationFrame(frameScrubberLoop);
  }
  requestAnimationFrame(frameScrubberLoop);

  // =========================================================================
  // 6. GSAP SCROLLTRIGGER HERO SCRUBBING & STAGES
  // =========================================================================
  const heroSection = document.getElementById('hero');

  function initHeroScrollTrigger() {
    // Pinned Hero Scrubber: Pins hero container in place until all frames play!
    ScrollTrigger.create({
      trigger: heroSection,
      start: 'top top',
      end: isMobile ? '+=3000' : '+=5000',
      pin: true,
      pinSpacing: true,
      scrub: 0.15,
      anticipatePin: 1,
      onUpdate: (self) => {
        const p = self.progress;
        
        // Update frame target smoothly across all frames
        targetFrameIndex = p * (TOTAL_FRAMES - 1);

        // Update hero progress thumb
        if (heroProgressThumb) {
          heroProgressThumb.style.width = `${(p * 100).toFixed(1)}%`;
        }

        // Stage Synchronization:
        // Stage 0: 0% to ~25%
        // Stage 1: 25% to ~60%
        // Stage 2: 60% to ~85%
        // Stage 3: 85% to 100%
        updateHeroStages(p);
      }
    });
  }

  function updateHeroStages(p) {
    // Stage 0: 0% - 25%
    if (p < 0.22) {
      setActiveStage(stage0);
    }
    // Stage 1: 22% - 58%
    else if (p >= 0.22 && p < 0.58) {
      setActiveStage(stage1);
    }
    // Stage 2: 58% - 84%
    else if (p >= 0.58 && p < 0.86) {
      setActiveStage(stage2);
    }
    // Stage 3: 86% - 100%
    else {
      setActiveStage(stage3);
    }
  }

  let currentActiveStage = null;
  function setActiveStage(targetStage) {
    if (currentActiveStage === targetStage) return;

    // Transition out previous
    if (currentActiveStage) {
      gsap.to(currentActiveStage, {
        opacity: 0,
        y: -15,
        duration: 0.35,
        ease: 'power2.in',
        onComplete: () => {
          currentActiveStage?.classList.remove('active');
        }
      });
    }

    currentActiveStage = targetStage;
    if (targetStage) {
      targetStage.classList.add('active');
      gsap.fromTo(targetStage, 
        { opacity: 0, y: 25 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.05 }
      );
    }
  }

  function initHeroStage0() {
    stage0.classList.add('active');
    currentActiveStage = stage0;
    gsap.fromTo(stage0, 
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );
  }

  // =========================================================================
  // 7. SECTION 02: HORIZONTAL PINNED DESIGN GALLERY
  // =========================================================================
  const horizontalWrapper = document.getElementById('horizontal-pin-wrapper');
  const horizontalTrack = document.getElementById('horizontal-track');

  function initHorizontalGallery() {
    if (!horizontalTrack || !horizontalWrapper) return;

    // Calculate total horizontal scroll distance
    const getScrollAmount = () => -(horizontalTrack.scrollWidth - window.innerWidth);

    const tween = gsap.to(horizontalTrack, {
      x: getScrollAmount,
      ease: 'none'
    });

    ScrollTrigger.create({
      trigger: horizontalWrapper,
      start: 'top top',
      end: () => `+=${horizontalTrack.scrollWidth - window.innerWidth + 200}`,
      pin: true,
      animation: tween,
      scrub: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Highlight active nav link
        updateNavIndicator('gallery');
      }
    });

    // Stagger reveal on gallery cards
    const cards = document.querySelectorAll('.gallery-card');
    cards.forEach((card) => {
      const content = card.querySelector('.card-content');
      if (content) {
        gsap.from(content.children, {
          scrollTrigger: {
            trigger: card,
            containerAnimation: tween,
            start: 'left center',
            toggleActions: 'play none none reverse'
          },
          y: 20,
          opacity: 0,
          stagger: 0.08,
          duration: 0.5,
          ease: 'power2.out'
        });
      }
    });
  }

  // =========================================================================
  // 8. SECTION 03: SPECS DASHBOARD & ANIMATED COUNTERS
  // =========================================================================
  const counterHp = document.getElementById('counter-hp');
  const counterAccel = document.getElementById('counter-accel');
  const counterTorque = document.getElementById('counter-torque');
  const counterSpeed = document.getElementById('counter-speed');

  const detailHp = document.getElementById('detail-hp');
  const detailAccel = document.getElementById('detail-accel');
  const detailTorque = document.getElementById('detail-torque');
  const detailSpeed = document.getElementById('detail-speed');

  let countersAnimated = false;

  function animateNumber(element, start, end, duration, decimals = 0) {
    const obj = { val: start };
    gsap.to(obj, {
      val: end,
      duration: duration,
      ease: 'power2.out',
      onUpdate: () => {
        element.textContent = decimals > 0 ? obj.val.toFixed(decimals) : Math.round(obj.val);
      }
    });
  }

  function initSpecsCounters() {
    ScrollTrigger.create({
      trigger: '#specs',
      start: 'top 70%',
      onEnter: () => {
        if (!countersAnimated) {
          countersAnimated = true;
          animateNumber(counterHp, 0, 503, 1.8, 0);
          animateNumber(counterAccel, 0, 3.9, 1.6, 1);
          animateNumber(counterTorque, 0, 650, 1.9, 0);
          animateNumber(counterSpeed, 0, 290, 2.0, 0);
        }
        updateNavIndicator('specs');
      }
    });

    // Drive Mode Selector Interactions
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeData = {
      comfort: {
        hp: 503, accel: 3.9, torque: 650, speed: 250,
        dHp: '@ 6,250 RPM (Standard Calibration)',
        dAccel: '3.9 s (Smooth Engagement)',
        dTorque: '650 Nm (Linear Throttle Delivery)',
        dSpeed: '250 km/h (Factory Standard Governed)'
      },
      sport: {
        hp: 503, accel: 3.8, torque: 650, speed: 290,
        dHp: '@ 6,250 RPM (Aggressive Spark Timing)',
        dAccel: '3.8 s (Drivelogic Level 2)',
        dTorque: '650 Nm (Sharpened Boost Response)',
        dSpeed: '290 km/h (M Driver\'s Package Unlocked)'
      },
      track: {
        hp: 503, accel: 3.5, torque: 650, speed: 290,
        dHp: '503 HP (Max Cooling Circuit Overdrive)',
        dAccel: '3.5 s (M xDrive Launch Mode)',
        dTorque: '650 Nm (Immediate Wastegate Pre-spool)',
        dSpeed: '290 km/h (Aero Downforce Optimized)'
      },
      drift: {
        hp: 503, accel: 4.1, torque: 650, speed: 290,
        dHp: '503 HP (100% Rear Axle Lockout)',
        dAccel: '4.1 s (M Traction Control Level 5)',
        dTorque: '650 Nm (Dynamic Yaw Drift Modulation)',
        dSpeed: '290 km/h (DSC Fully Deactivated)'
      }
    };

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        const mode = btn.dataset.mode;
        const config = modeData[mode];
        if (config) {
          animateNumber(counterHp, parseFloat(counterHp.textContent), config.hp, 0.6, 0);
          animateNumber(counterAccel, parseFloat(counterAccel.textContent), config.accel, 0.6, 1);
          animateNumber(counterTorque, parseFloat(counterTorque.textContent), config.torque, 0.6, 0);
          animateNumber(counterSpeed, parseFloat(counterSpeed.textContent), config.speed, 0.6, 0);

          detailHp.textContent = config.dHp;
          detailAccel.textContent = config.dAccel;
          detailTorque.textContent = config.dTorque;
          detailSpeed.textContent = config.dSpeed;
        }
      });
    });
  }

  // =========================================================================
  // 9. SECTION 04: ENGINEERING SPLIT WITH STICKY VISUAL
  // =========================================================================
  function initEngineeringSplit() {
    const textBlocks = document.querySelectorAll('.eng-text-block');
    const visuals = document.querySelectorAll('.eng-visual');
    const hudChip = document.getElementById('eng-hud-chip');

    textBlocks.forEach((block) => {
      ScrollTrigger.create({
        trigger: block,
        start: 'top 55%',
        end: 'bottom 55%',
        onEnter: () => activateBlock(block),
        onEnterBack: () => activateBlock(block)
      });
    });

    function activateBlock(block) {
      textBlocks.forEach(b => b.classList.remove('active'));
      block.classList.add('active');

      const targetVisualId = block.dataset.visual;
      const chipText = block.dataset.chip;

      visuals.forEach(v => {
        if (v.id === targetVisualId) {
          v.classList.add('active');
        } else {
          v.classList.remove('active');
        }
      });

      if (hudChip && chipText) {
        hudChip.textContent = chipText;
      }
    }
  }

  // =========================================================================
  // 10. SECTION 05: INTERACTIVE S58 ACOUSTIC WEB AUDIO SYNTHESIZER
  // =========================================================================
  let audioCtx = null;
  let osc1 = null;
  let osc2 = null;
  let filter = null;
  let masterGain = null;
  let isSoundActive = false;
  let isRevving = false;
  let rpm = 850;
  let targetRpm = 850;

  const tachoValue = document.getElementById('tacho-value');
  const tachoProgress = document.getElementById('tacho-progress');
  const throttleBtn = document.getElementById('throttle-btn');
  const soundToggleBtn = document.getElementById('sound-toggle-btn');
  const valveBtn = document.getElementById('valve-btn');

  function initAudioContext() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();

      // Master Gain
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.001, audioCtx.currentTime);

      // Lowpass resonant filter for the deep exhaust chamber
      filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(280, audioCtx.currentTime);
      filter.Q.setValueAtTime(4.5, audioCtx.currentTime);

      // Twin Sawtooth Oscillators simulating S58 inline-6 combustion firing pulses
      osc1 = audioCtx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(42.5, audioCtx.currentTime); // 850 RPM base frequency

      osc2 = audioCtx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(85, audioCtx.currentTime); // 2nd harmonic

      const oscSub = audioCtx.createOscillator();
      oscSub.type = 'sine';
      oscSub.frequency.setValueAtTime(21.25, audioCtx.currentTime); // Sub-bass rumble

      osc1.connect(filter);
      osc2.connect(filter);
      oscSub.connect(filter);
      filter.connect(masterGain);
      masterGain.connect(audioCtx.destination);

      osc1.start();
      osc2.start();
      oscSub.start();
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  function startEngineAudio() {
    initAudioContext();
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    isSoundActive = true;
    soundToggleBtn.classList.add('active');
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.18, audioCtx.currentTime + 0.3);
  }

  function stopEngineAudio() {
    if (!audioCtx || !isSoundActive) return;
    isSoundActive = false;
    soundToggleBtn.classList.remove('active');
    masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.4);
  }

  soundToggleBtn.addEventListener('click', () => {
    if (isSoundActive) {
      stopEngineAudio();
    } else {
      startEngineAudio();
    }
  });

  // Throttle button press-and-hold
  function startRevving() {
    if (!isSoundActive) {
      startEngineAudio();
    }
    isRevving = true;
    targetRpm = 7200;
    throttleBtn.classList.add('revving');
  }

  function stopRevving() {
    isRevving = false;
    targetRpm = 850;
    throttleBtn.classList.remove('revving');
  }

  if (throttleBtn) {
    throttleBtn.addEventListener('mousedown', startRevving);
    window.addEventListener('mouseup', stopRevving);
    throttleBtn.addEventListener('touchstart', (e) => { e.preventDefault(); startRevving(); });
    window.addEventListener('touchend', stopRevving);
  }

  // Tachometer & Audio frequency update loop
  function audioTachoLoop() {
    // Lerp RPM
    const lerpSpeed = isRevving ? 0.08 : 0.04;
    rpm += (targetRpm - rpm) * lerpSpeed;

    if (tachoValue) {
      tachoValue.textContent = Math.round(rpm);
    }

    // Tachometer gauge offset (circumference = 2 * PI * 80 ~= 502, arc visible is ~376)
    if (tachoProgress) {
      const rpmFraction = Math.max(0, Math.min(1, (rpm - 850) / (7200 - 850)));
      const strokeOffset = 376 - (rpmFraction * 282);
      tachoProgress.style.strokeDashoffset = strokeOffset;
    }

    // Modulate audio synthesis parameters
    if (audioCtx && isSoundActive && filter && osc1) {
      const baseFreq = (rpm / 60) * 3; // Inline 6 cylinder firing pulses
      osc1.frequency.setValueAtTime(baseFreq, audioCtx.currentTime);
      osc2.frequency.setValueAtTime(baseFreq * 2, audioCtx.currentTime);

      const filterCutoff = 250 + (rpm / 7200) * 1800;
      filter.frequency.setValueAtTime(filterCutoff, audioCtx.currentTime);
    }

    requestAnimationFrame(audioTachoLoop);
  }
  requestAnimationFrame(audioTachoLoop);

  // Exhaust Valve Toggle
  if (valveBtn) {
    valveBtn.addEventListener('click', () => {
      valveBtn.classList.toggle('active');
      const isOpen = valveBtn.classList.contains('active');
      valveBtn.textContent = isOpen ? 'OPEN // SPORT TRACK' : 'CLOSED // COMFORT QUIET';
      if (filter) {
        filter.Q.setValueAtTime(isOpen ? 5.5 : 2.0, audioCtx ? audioCtx.currentTime : 0);
      }
    });
  }

  // =========================================================================
  // 11. NAVIGATION, ANCHOR SMOOTH SCROLL & BACK TO TOP
  // =========================================================================
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href');
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        lenis.scrollTo(targetEl, { offset: -60, duration: 1.5 });
      }
    });
  });

  function updateNavIndicator(sectionName) {
    navLinks.forEach(l => {
      if (l.dataset.section === sectionName) {
        l.classList.add('active');
      } else {
        l.classList.remove('active');
      }
    });
  }

  // Back to top button
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      lenis.scrollTo(0, { duration: 1.8 });
    });
  }

  // =========================================================================
  // 12. INITIALIZATION SEQUENCE
  // =========================================================================
  startProgressiveLoading();
  initHeroScrollTrigger();
  initHorizontalGallery();
  initSpecsCounters();
  initEngineeringSplit();

  // Refresh ScrollTrigger after assets settle
  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
  });
});
