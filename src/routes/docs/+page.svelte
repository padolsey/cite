<script lang="ts">
  import { onMount } from 'svelte';
  import { marked } from 'marked';

  let docContent = $state('');
  let activeSection = $state('');
  let searchQuery = $state('');
  let showMobileNav = $state(false);

  interface NavItem {
    id: string;
    title: string;
    level: number;
  }

  let navItems = $derived<NavItem[]>(() => {
    if (!docContent) return [];

    const headingRegex = /^(#{1,3})\s+(.+)$/gm;
    const items: NavItem[] = [];
    let match;

    while ((match = headingRegex.exec(docContent)) !== null) {
      const level = match[1].length;
      const title = match[2];
      const id = title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');

      items.push({ id, title, level });
    }

    return items;
  });

  let filteredNavItems = $derived(() => {
    if (!searchQuery) return navItems;
    const query = searchQuery.toLowerCase();
    return navItems.filter(item =>
      item.title.toLowerCase().includes(query)
    );
  });

  // Configure marked with custom renderer for heading IDs
  const renderer = new marked.Renderer();
  const originalHeading = renderer.heading.bind(renderer);

  renderer.heading = function({ text, depth }: { text: string; depth: number }) {
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');

    return `<h${depth} id="${id}">${text}</h${depth}>`;
  };

  marked.setOptions({
    breaks: true,
    gfm: true,
    renderer: renderer
  });

  let renderedContent = $derived.by(() => {
    if (!docContent) return '';
    return marked.parse(docContent);
  });

  onMount(async () => {
    try {
      const response = await fetch('/docs/api-v1.md');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const text = await response.text();
      console.log('Loaded markdown, length:', text.length);
      docContent = text;

      // Set up intersection observer for active section
      setTimeout(() => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                const id = entry.target.id;
                if (id) activeSection = id;
              }
            });
          },
          { rootMargin: '-100px 0px -66% 0px' }
        );

        document.querySelectorAll('h1[id], h2[id], h3[id]').forEach((heading) => {
          observer.observe(heading);
        });

        return () => observer.disconnect();
      }, 100);
    } catch (error) {
      console.error('Failed to load documentation:', error);
      docContent = '# Error\n\nFailed to load documentation.';
    }
  });

  function scrollToSection(id: string) {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      activeSection = id;
      showMobileNav = false;
    }
  }

  function handleCopyCode(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const codeBlock = target.closest('pre');
    if (codeBlock) {
      const code = codeBlock.textContent || '';
      navigator.clipboard.writeText(code);

      // Show feedback
      target.textContent = '✓ Copied';
      setTimeout(() => {
        target.textContent = 'Copy';
      }, 2000);
    }
  }
</script>

<svelte:head>
  <title>CITE Safety API Documentation</title>
  <meta name="description" content="Technical documentation for the CITE Safety API - Mental health safety for conversational AI" />
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
    <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center gap-4">
          <a href="/" class="flex items-center gap-2">
            <div class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm">
              C
            </div>
            <span class="font-semibold text-gray-900">CITE Safety</span>
          </a>
          <span class="text-sm text-gray-500 hidden sm:inline">API Documentation v1.0</span>
        </div>

        <div class="flex items-center gap-4">
          <a href="/sandbox" class="text-sm text-gray-600 hover:text-gray-900">
            Try Demo
          </a>
          <a
            href="https://github.com/cite-safety/cite"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-gray-600 hover:text-gray-900"
          >
            GitHub
          </a>
          <button
            onclick={() => showMobileNav = !showMobileNav}
            class="lg:hidden px-3 py-2 text-gray-600 hover:text-gray-900"
            aria-label="Toggle navigation"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </header>

  <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div class="flex gap-8">
      <!-- Sidebar Navigation -->
      <aside
        class={`lg:sticky lg:top-24 lg:block ${showMobileNav ? 'fixed inset-0 z-40 bg-white' : 'hidden'} lg:w-64 h-fit`}
      >
        <div class="lg:pr-4">
          {#if showMobileNav}
            <div class="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
              <span class="font-semibold">Navigation</span>
              <button
                onclick={() => showMobileNav = false}
                class="p-2 text-gray-600 hover:text-gray-900"
              >
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          {/if}

          <div class="p-4 lg:p-0">
            <!-- Search -->
            <div class="mb-4">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Search sections..."
                class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Navigation Items -->
            <nav class="space-y-1 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {#each filteredNavItems as item}
                <button
                  onclick={() => scrollToSection(item.id)}
                  class={`block w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    item.level === 1 ? 'font-semibold' : item.level === 2 ? 'pl-6' : 'pl-9'
                  } ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.title}
                </button>
              {/each}
            </nav>

            {#if filteredNavItems.length === 0 && searchQuery}
              <p class="text-sm text-gray-500 text-center py-4">No sections found</p>
            {/if}
          </div>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 min-w-0">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-8 lg:p-12">
          {#if docContent}
            <article
              class="prose prose-slate max-w-none
                prose-headings:scroll-mt-24
                prose-h1:text-4xl prose-h1:font-bold prose-h1:mb-8 prose-h1:pb-4 prose-h1:border-b prose-h1:border-gray-200
                prose-h2:text-2xl prose-h2:font-semibold prose-h2:mt-12 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-100
                prose-h3:text-xl prose-h3:font-semibold prose-h3:mt-8 prose-h3:mb-3
                prose-p:text-gray-700 prose-p:leading-relaxed
                prose-a:text-blue-600 prose-a:no-underline prose-a:hover:underline
                prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:relative
                [&_pre_code]:!text-gray-100 [&_pre_code]:!bg-transparent
                prose-table:border-collapse prose-table:w-full
                prose-th:bg-gray-50 prose-th:border prose-th:border-gray-300 prose-th:px-4 prose-th:py-2 prose-th:text-left
                prose-td:border prose-td:border-gray-300 prose-td:px-4 prose-td:py-2
                prose-ul:list-disc prose-ul:pl-6
                prose-ol:list-decimal prose-ol:pl-6
                prose-li:text-gray-700
                prose-strong:text-gray-900 prose-strong:font-semibold
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:py-2 prose-blockquote:px-4
              "
            >
              {@html renderedContent}
            </article>
          {:else}
            <div class="flex items-center justify-center py-12">
              <div class="text-center">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p class="text-gray-600">Loading documentation...</p>
              </div>
            </div>
          {/if}
        </div>

        <!-- Footer -->
        <footer class="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>
            CITE Safety API v1.0 • Last updated: 2025-11-17 •
            <a href="https://github.com/cite-safety/cite" class="text-blue-600 hover:underline">Open Source</a>
          </p>
          <p class="mt-2 text-xs text-gray-500">
            This API provides mental health safety infrastructure, not medical advice.
          </p>
        </footer>
      </main>
    </div>
  </div>
</div>

<style>
  /* Enhance code blocks with copy button */
  :global(pre) {
    position: relative;
  }

  :global(pre code) {
    display: block;
    padding: 1rem;
    overflow-x: auto;
  }

  /* Add copy button to code blocks via JS enhancement */
  :global(pre::before) {
    content: 'Copy';
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 0.75rem;
    border-radius: 0.25rem;
    cursor: pointer;
    z-index: 10;
    opacity: 0;
    transition: opacity 0.2s;
  }

  :global(pre:hover::before) {
    opacity: 1;
  }

  /* Smooth scroll behavior */
  :global(html) {
    scroll-behavior: smooth;
  }

  /* Style for inline code in tables */
  :global(td code, th code) {
    white-space: nowrap;
  }

  /* Responsive table wrapper */
  :global(.prose table) {
    display: block;
    overflow-x: auto;
    max-width: 100%;
  }
</style>
