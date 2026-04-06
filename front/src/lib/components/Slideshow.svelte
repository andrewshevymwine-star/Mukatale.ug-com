<script>
    import { onMount, onDestroy } from 'svelte';
  
    // ─── UPDATE these filenames to match your actual files in /static ───────────
    // If your files are named consistently (e.g. photo1.jpg … photo28.jpg) you can
    // auto-generate: const slides = Array.from({length:28},(_,i)=>({image:`/photo${i+1}.jpg`, caption:'...'}))
    const slides = [
      { image: '/kampala.jpg',  caption: 'Welcome to the Pearl' },
      { image: '/dusk.jpg',  caption: 'Where Art is the Nature' },
      { image: '/kids.jpg',  caption: 'Warm People, Warm Hearts' },
      { image: '/cow.jpg',  caption: 'Where Life is Truly Lived' },
      { image: '/safari.jpg',  caption: 'Come Experience Our Treasure' },
      { image: '/boy.jpg',  caption: 'Share Our Joy' },
      { image: '/cow-me.jpg',  caption: 'Live Our Story' },
      { image: '/hotel.jpg',  caption: 'We Are the Pearl' },
      { image: '/crane.jpg',  caption: 'Come Fly With the Crane' },
      { image: '/decor.jpg', caption: 'Dine With Us' },
      { image: '/island.jpg', caption: 'An Experience of a Lifetime' },
      { image: '/crater.jpg', caption: 'The Best Things in Life Are Free' },
      { image: '/kasese.jpg', caption: 'And We Have Them All' },
      { image: '/money.jpg', caption: "Don't Let Your Balance Decide" },
      { image: '/ride.jpg', caption: 'Discover the Pearl of Africa' },
      { image: '/gorilla.jpg', caption: 'Gorillas in the Mist' },
      { image: '/lake.jpg', caption: 'Source of the Nile' },
      { image: '/bwindi.jpg', caption: 'Bwindi Impenetrable Forest' },
      { image: '/falls.jpg', caption: 'Murchison Falls' },
      { image: '/giraffe.jpg', caption: 'Queen Elizabeth National Park' },
      { image: '/lake.jpg', caption: 'Lake Victoria Sunsets' },
      { image: '/night.jpg', caption: 'Kampala City Lights' },
      { image: '/smile.jpg', caption: 'Culture & Heritage' },
      { image: '/food.jpg', caption: 'Flavours of Uganda' },
      { image: '/gorilla.jpg', caption: 'Wildlife Safari' },
      { image: '/duck.jpg', caption: 'Bird Watching Paradise' },
      { image: '/boat.jpg', caption: 'Adventurous Trails' },
      { image: '/sun.jpg', caption: 'Come Home to the Pearl' },
    ];
    // ─────────────────────────────────────────────────────────────────────────────
  
    // Storyline overlays shown on key slides (indices 0, 7, 13, 27)
    const storyMap = {
      0:  {
        eyebrow: 'Uganda Tourism Board  ×  Uganda Airlines',
        heading: 'Welcome to\nthe Pearl',
        sub: 'A place where art is the nature,\nwhere people are warm.',
      },
      7:  {
        eyebrow: 'Live Our Story',
        heading: 'We Are\nthe Pearl',
        sub: 'Come experience our treasure,\nshare our joy.',
      },
      13: {
        eyebrow: 'Fly With the Crane',
        heading: 'An Experience\nof a Lifetime',
        sub: 'Come fly with us. Dine with us.\nWe promise a journey unforgettable.',
      },
      27: {
        eyebrow: 'The Best Things in Life Are Free',
        heading: "Don't Let Your\nBalance Decide",
        sub: 'We have the best things in life,\nand we share them all.',
      },
    };
  
    let current      = 0;
    let prev         = null;
    let transitioning = false;
    let timer;
    let progressWidth = 0;
    let progressTimer;
    let thumbsEl;
  
    const DURATION   = 4000;  // ms per slide
    const TRANSITION = 700;   // ms crossfade
  
    function goTo(index) {
      if (transitioning || index === current) return;
      transitioning = true;
      prev    = current;
      current = index;
      resetProgress();
      scrollThumbIntoView(index);
      setTimeout(() => { prev = null; transitioning = false; }, TRANSITION);
    }
  
    function next() { goTo((current + 1) % slides.length); }
    function back() { goTo((current - 1 + slides.length) % slides.length); }
  
    function resetProgress() {
      progressWidth = 0;
      clearInterval(progressTimer);
      const step = 100 / (DURATION / 40);
      progressTimer = setInterval(() => {
        progressWidth = Math.min(progressWidth + step, 100);
      }, 40);
    }
  
    function scrollThumbIntoView(index) {
      if (!thumbsEl) return;
      const btn = thumbsEl.querySelectorAll('.thumb')[index];
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  
    function startAuto()  { clearInterval(timer); timer = setInterval(next, DURATION); }
    function pauseAuto()  { clearInterval(timer); }
    function resumeAuto() { startAuto(); }
  
    onMount(()  => { resetProgress(); startAuto(); });
    onDestroy(() => { clearInterval(timer); clearInterval(progressTimer); });
  </script>
  
  <svelte:head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link
      href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300;1,400&family=Montserrat:wght@300;400;600&display=swap"
      rel="stylesheet"
    />
  </svelte:head>
  
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div
    class="ss-wrap"
    on:mouseenter={pauseAuto}
    on:mouseleave={resumeAuto}
  >
  
    <!-- ══ Main stage ══ -->
    <div class="ss-stage">
      {#each slides as slide, i}
        {@const isActive = i === current}
        {@const isPrev   = i === prev}
        {@const story    = storyMap[i]}
  
        <div class="slide" class:slide--active={isActive} class:slide--prev={isPrev}>
          <!-- Background image with Ken-Burns zoom -->
          <div
            class="slide__bg"
            class:slide__bg--zoom={isActive}
            style="background-image: url('{slide.image}')"
          ></div>
  
          <!-- Gradient overlay -->
          <div class="slide__overlay"></div>
  
          <!-- Story panel — shown only on flagged slides -->
          {#if story && isActive}
            <div class="slide__story slide__story--enter">
              <p class="story__eyebrow">{story.eyebrow}</p>
              <h2 class="story__title">{@html story.heading.replace(/\n/g, '<br/>')}</h2>
              <p class="story__body">{@html story.sub.replace(/\n/g, '<br/>')}</p>
              <div class="story__brands">
                <span class="brand brand--utb">Uganda Tourism Board</span>
                <span class="brand--sep">✦</span>
                <span class="brand brand--ual">Uganda Airlines</span>
              </div>
            </div>
          {/if}
  
          <!-- Caption (all slides) -->
          {#if isActive}
            <div class="slide__caption slide__caption--enter">{slide.caption}</div>
          {/if}
        </div>
      {/each}
  
      <!-- Navigation arrows -->
      <button class="arrow arrow--left"  on:click={back} aria-label="Previous slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <button class="arrow arrow--right" on:click={next} aria-label="Next slide">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
  
      <!-- Slide counter -->
      <div class="counter">
        <span class="counter__current">{String(current + 1).padStart(2, '0')}</span>
        <span class="counter__sep">/</span>
        <span class="counter__total">{String(slides.length).padStart(2, '0')}</span>
      </div>
  
      <!-- Progress bar -->
      <div class="progress-bar">
        <div class="progress-bar__fill" style="width:{progressWidth}%"></div>
      </div>
    </div>
  
    <!-- ══ Thumbnail strip ══ -->
    <div class="thumbs-outer">
      <div class="thumbs-inner" bind:this={thumbsEl}>
        {#each slides as slide, i}
          <button
            class="thumb"
            class:thumb--active={i === current}
            on:click={() => goTo(i)}
            aria-label="Go to slide {i + 1}"
            style="background-image: url('{slide.image}')"
          >
            <span class="thumb__num">{i + 1}</span>
          </button>
        {/each}
      </div>
    </div>
  
  </div>
  
  <style>
    /* ── Wrapper ── */
    .ss-wrap {
      width: 100%;
      border-radius: 0.75rem;
      overflow: hidden;
      background: #0c0c0c;
      display: flex;
      flex-direction: column;
      user-select: none;
    }
  
    /* ── Stage ── */
    .ss-stage {
      position: relative;
      width: 100%;
      height: 460px;
      overflow: hidden;
    }
  
    /* ── Slides ── */
    .slide {
      position: absolute;
      inset: 0;
      opacity: 0;
      transition: opacity 0.7s ease;
      pointer-events: none;
    }
    .slide--active { opacity: 1; pointer-events: auto; z-index: 2; }
    .slide--prev   { opacity: 0; z-index: 1; }
  
    /* Background image */
    .slide__bg {
      position: absolute;
      inset: 0;
      background-size: cover;
      background-position: center;
      transform: scale(1);
      transition: transform 5s ease;
    }
    .slide__bg--zoom { transform: scale(1.06); }
  
    /* Gradient overlay */
    .slide__overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to right,
        rgba(0,0,0,0.70) 0%,
        rgba(0,0,0,0.28) 50%,
        rgba(0,0,0,0.06) 100%
      );
    }
  
    /* ── Story panel ── */
    .slide__story {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 3rem 3.5rem;
      max-width: 520px;
      color: #fff;
      opacity: 0;
      transform: translateY(20px);
    }
    .slide__story--enter {
      animation: fadeUp 0.7s ease 0.25s forwards;
    }
    @keyframes fadeUp {
      to { opacity: 1; transform: translateY(0); }
    }
  
    .story__eyebrow {
      font-family: 'Montserrat', sans-serif;
      font-size: 0.6rem;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #f5c842;
      margin: 0 0 0.8rem;
    }
    .story__title {
      font-family: 'Cormorant Garamond', serif;
      font-size: clamp(2.2rem, 4vw, 3.2rem);
      font-weight: 300;
      font-style: italic;
      line-height: 1.15;
      margin: 0 0 1rem;
      text-shadow: 0 2px 20px rgba(0,0,0,0.4);
    }
    .story__body {
      font-family: 'Montserrat', sans-serif;
      font-size: 0.85rem;
      font-weight: 300;
      line-height: 1.85;
      color: rgba(255,255,255,0.85);
      margin: 0 0 1.8rem;
    }
    .story__brands {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }
    .brand {
      font-family: 'Montserrat', sans-serif;
      font-size: 0.58rem;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      padding: 0.3rem 0.7rem;
      border-radius: 2px;
    }
    .brand--utb { background: #f5c842; color: #1a1a1a; }
    .brand--ual { border: 1px solid rgba(255,255,255,0.5); color: #fff; }
    .brand--sep { font-size: 0.5rem; color: rgba(255,255,255,0.35); }
  
    /* ── Caption bar ── */
    .slide__caption {
      position: absolute;
      bottom: 3.2rem;
      right: 1.5rem;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.78);
      background: rgba(0,0,0,0.38);
      backdrop-filter: blur(6px);
      padding: 0.4rem 0.85rem;
      border-radius: 2px;
      opacity: 0;
    }
    .slide__caption--enter {
      animation: fadeUp 0.6s ease 0.4s forwards;
    }
  
    /* ── Arrows ── */
    .arrow {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 10;
      background: rgba(255,255,255,0.10);
      border: 1px solid rgba(255,255,255,0.22);
      color: #fff;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: background 0.2s, transform 0.2s;
      backdrop-filter: blur(4px);
    }
    .arrow:hover {
      background: rgba(245, 200, 66, 0.3);
      transform: translateY(-50%) scale(1.1);
    }
    .arrow svg    { width: 1rem; height: 1rem; }
    .arrow--left  { left: 1rem; }
    .arrow--right { right: 1rem; }
  
    /* ── Counter ── */
    .counter {
      position: absolute;
      top: 1rem;
      right: 1.25rem;
      z-index: 10;
      display: flex;
      align-items: baseline;
      gap: 0.25rem;
      font-family: 'Montserrat', sans-serif;
      color: rgba(255,255,255,0.8);
    }
    .counter__current { font-size: 1.4rem; font-weight: 300; }
    .counter__sep     { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
    .counter__total   { font-size: 0.7rem; color: rgba(255,255,255,0.4); }
  
    /* ── Progress bar ── */
    .progress-bar {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 3px;
      background: rgba(255,255,255,0.12);
      z-index: 10;
    }
    .progress-bar__fill {
      height: 100%;
      background: #f5c842;
      transition: width 0.04s linear;
    }
  
    /* ── Thumbnail strip ── */
    .thumbs-outer {
      background: #111;
      border-top: 1px solid rgba(255,255,255,0.07);
      padding: 0.5rem 0;
      overflow: hidden;
    }
    .thumbs-inner {
      display: flex;
      gap: 0.4rem;
      overflow-x: auto;
      padding: 0 0.75rem;
      scrollbar-width: thin;
      scrollbar-color: #333 transparent;
    }
    .thumbs-inner::-webkit-scrollbar       { height: 3px; }
    .thumbs-inner::-webkit-scrollbar-track { background: transparent; }
    .thumbs-inner::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  
    .thumb {
      flex-shrink: 0;
      width: 72px;
      height: 48px;
      border-radius: 3px;
      background-size: cover;
      background-position: center;
      border: 2px solid transparent;
      cursor: pointer;
      position: relative;
      transition: border-color 0.2s, opacity 0.2s, transform 0.2s;
      opacity: 0.45;
      overflow: hidden;
    }
    .thumb:hover    { opacity: 0.85; transform: scaleY(1.05); }
    .thumb--active  { border-color: #f5c842; opacity: 1; transform: scaleY(1.08); }
  
    .thumb__num {
      position: absolute;
      bottom: 2px;
      right: 4px;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.52rem;
      font-weight: 600;
      color: rgba(255,255,255,0.75);
      line-height: 1;
    }
  
    /* ── Responsive ── */
    @media (max-width: 600px) {
      .ss-stage { height: 320px; }
      .slide__story { padding: 1.75rem; }
      .arrow { display: none; }
      .thumb { width: 54px; height: 36px; }
    }
  </style>