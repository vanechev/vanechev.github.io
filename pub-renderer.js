/* ------------------------------------------------------------------
   Publications renderer
   Reads publications.json (one record per publication, hand-editable)
   and renders .pub-item cards grouped by year, reproducing the
   hand-authored markup structure exactly.

   To add / edit a publication: just edit publications.json — no HTML
   editing required. Each record supports:
     citekey      (string, optional)  — used for the BibTeX block & React key
     title        (string, required)
     authorsHtml  (string, required)  — inline HTML, e.g. "<strong>Echeverria, V.</strong>, ..."
     venue        (string, required)
     year         (string, required)  — "2026", ... "2018", or "older"
     type         (string, required)  — "journal" | "conference" | "workshop"
     topics       (string[], required)
     badges       ({style, text}[], required) — style: "journal"|"conference"|"workshop"
     award        (string, optional)  — text for the award/note pill
     doi          (string, optional)  — DOI (without the doi.org/ prefix)
     bibtex       (string, optional)  — full BibTeX block; adds a collapsible BibTeX toggle
   ------------------------------------------------------------------ */

(function () {

  const YEAR_GROUPS = ['2026','2025','2024','2023','2022','2021','2020','2019','2018','older'];
  const YEAR_LABELS = {
    '2026':'2026','2025':'2025','2024':'2024','2023':'2023','2022':'2022',
    '2021':'2021','2020':'2020','2019':'2019','2018':'2018','older':'2017 &amp; earlier'
  };
  const BADGE_CLASS = {
    journal: 'badge-journal',
    conference: 'badge-conference',
    workshop: 'badge-workshop'
  };

  function renderCard(pub) {
    const item = document.createElement('div');
    item.className = 'pub-item';
    item.dataset.topics = (pub.topics || []).join(',');
    item.dataset.type = pub.type || 'conference';
    item.dataset.year = pub.year || 'older';

    // Badge row
    const badgeWrap = document.createElement('div');
    badgeWrap.style.marginBottom = '6px';
    (pub.badges || []).forEach((b, i) => {
      const span = document.createElement('span');
      span.className = `badge ${BADGE_CLASS[b.style] || 'badge-conference'}`;
      if (i > 0) span.style.marginLeft = '6px';
      span.textContent = b.text;
      badgeWrap.appendChild(span);
    });
    if (pub.award) {
      const awardSpan = document.createElement('span');
      awardSpan.className = 'pub-award-note';
      awardSpan.style.fontSize = '0.7rem';
      awardSpan.style.marginLeft = '6px';
      awardSpan.textContent = pub.award;
      badgeWrap.appendChild(awardSpan);
    }
    item.appendChild(badgeWrap);

    // Title
    const title = document.createElement('div');
    title.className = 'pub-item-title';
    title.textContent = pub.title;
    item.appendChild(title);

    // Authors (inline HTML, e.g. <strong> for the page owner)
    const authors = document.createElement('div');
    authors.className = 'pub-item-authors';
    authors.innerHTML = pub.authorsHtml;
    item.appendChild(authors);

    // Venue
    const venue = document.createElement('div');
    venue.className = 'pub-item-venue';
    venue.innerHTML = pub.venue;
    item.appendChild(venue);

    // Links (DOI / BibTeX toggle) — only rendered if there's something to show
    if (pub.doi || pub.bibtex) {
      const links = document.createElement('div');
      links.className = 'feat-pub-links';
      links.style.marginTop = '10px';
      if (pub.doi) {
        const doiLink = document.createElement('a');
        doiLink.className = 'pub-link';
        doiLink.href = `https://doi.org/${pub.doi}`;
        doiLink.target = '_blank';
        doiLink.textContent = 'DOI';
        links.appendChild(doiLink);
      }
      if (pub.bibtex) {
        const bibToggle = document.createElement('a');
        bibToggle.className = 'pub-link bibtex-toggle';
        bibToggle.href = '#';
        bibToggle.textContent = 'BibTeX';
        links.appendChild(bibToggle);
      }
      item.appendChild(links);
    }

    // Collapsible BibTeX block
    if (pub.bibtex) {
      const pre = document.createElement('pre');
      pre.className = 'bib-entry';
      pre.textContent = pub.bibtex;
      item.appendChild(pre);
    }

    return item;
  }

  function yearGroupFor(year) {
    if (!year) return 'older';
    if (year === 'older') return 'older';
    const y = parseInt(year, 10);
    if (isNaN(y)) return 'older';
    if (y >= 2018 && y <= 2026) return String(y);
    return 'older';
  }

  async function renderPublications() {
    const container = document.querySelector('.pub-list-container') || findInsertionPoint();
    if (!container) return;

    let pubs;
    try {
      pubs = await fetch('publications.json').then(r => r.json());
    } catch (err) {
      console.error('Failed to load publications.json:', err);
      return;
    }

    // Remove any existing static year-group sections (in case the renderer
    // is dropped onto a page that still has hand-authored cards).
    document.querySelectorAll('.pub-year-group').forEach(g => g.remove());

    // Bucket by year group, preserving the JSON's authored order within each bucket
    const buckets = {};
    YEAR_GROUPS.forEach(g => buckets[g] = []);
    pubs.forEach(pub => buckets[yearGroupFor(pub.year)].push(pub));

    const fragment = document.createDocumentFragment();
    YEAR_GROUPS.forEach(group => {
      const list = buckets[group];
      if (!list.length) return;

      const groupEl = document.createElement('div');
      groupEl.className = 'pub-year-group';
      groupEl.dataset.yearGroup = group;

      const label = document.createElement('div');
      label.className = 'pub-year-label';
      label.innerHTML = YEAR_LABELS[group];
      groupEl.appendChild(label);

      list.forEach(pub => groupEl.appendChild(renderCard(pub)));
      fragment.appendChild(groupEl);
    });

    container.appendChild(fragment);

    // Wire up BibTeX toggles for the freshly-rendered cards
    document.querySelectorAll('.bibtex-toggle').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        const entry = btn.closest('.pub-item').querySelector('.bib-entry');
        if (entry) entry.classList.toggle('open');
      });
    });

    // Re-apply active filters now that cards exist
    if (typeof window.applyPublicationFilters === 'function') {
      window.applyPublicationFilters();
    }
  }

  // Fallback insertion point: place year-groups directly after the Year filter
  // group, inside the same .section that historically held the static cards.
  function findInsertionPoint() {
    const yearNav = document.getElementById('year-nav');
    if (yearNav) {
      const filterGroup = yearNav.closest('.pub-filter-group');
      if (filterGroup) return filterGroup.parentElement;
    }
    return document.querySelector('.section');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPublications);
  } else {
    renderPublications();
  }

})();
