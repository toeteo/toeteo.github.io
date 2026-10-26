(function () {
  let countryData = [];
  let categories = [];

  const status = document.getElementById('status');
  const categoryList = document.getElementById('categoryList');
  const partialToggle = document.getElementById('partialToggle');
  const resultsHead = document.getElementById('resultsHead');
  const resultsBody = document.getElementById('resultsBody');
  const emptyState = document.getElementById('emptyState');

  fetch('data.json')
    .then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    })
    .then(data => {
      countryData = data;
      categories = discoverCategories(countryData);
      status.textContent = `loaded ${countryData.length} countries, ${categories.length} categories.`;
      renderCategoryControls(categories);
      runRanking();
    })
    .catch(err => {
      status.textContent = 'Error loading index.json: ' + err.message;
    });

  partialToggle.addEventListener('change', runRanking);

  function discoverCategories(data) {
    const set = new Set();
    for (const country of data) {
      const scores = country.scores || {};
      Object.keys(scores).forEach(k => set.add(k));
    }
    return Array.from(set).sort();
  }

  function renderCategoryControls(cats) {
    categoryList.innerHTML = '';
    cats.forEach(cat => {
      const row = document.createElement('div');
      row.className = 'category-row active';

      const topRow = document.createElement('div');
      topRow.className = 'category-row-top';
      const label = document.createElement('label');
      label.textContent = cat;
      label.setAttribute('for', 'weight_' + cat);
      const valSpan = document.createElement('span');
      valSpan.textContent = '5';
      topRow.appendChild(label);
      topRow.appendChild(valSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.id = 'weight_' + cat;
      slider.min = '0';
      slider.max = '10';
      slider.step = '1';
      slider.value = '5';
      slider.dataset.category = cat;
      slider.style.setProperty('--pct', '50%');

      slider.addEventListener('input', () => {
        valSpan.textContent = slider.value;
        slider.style.setProperty('--pct', (slider.value / 10 * 100) + '%');
        row.classList.toggle('active', parseFloat(slider.value) > 0);
        runRanking();
      });

      row.appendChild(topRow);
      row.appendChild(slider);
      categoryList.appendChild(row);
    });
  }

  function getWeights() {
    const weights = {};
    categories.forEach(cat => {
      const slider = document.getElementById('weight_' + cat);
      weights[cat] = slider ? parseFloat(slider.value) : 0;
    });
    return weights;
  }

  function computeRanking(data, weights, usePartial) {
    const activeCats = Object.keys(weights).filter(k => weights[k] > 0);
    const results = [];

    for (const country of data) {
      const scores = country.scores || {};
      const present = {};
      let missingCount = 0;

      activeCats.forEach(cat => {
        if (scores[cat] !== undefined) {
          present[cat] = scores[cat][1]; // normalized score
        } else {
          present[cat] = 0;
          missingCount++;
        }
      });

      const presentKeys = Object.keys(present);
      if (presentKeys.length === 0) continue;
      if (!usePartial && missingCount > 0) continue;

      let weightSum = 0;
      let weightedScore = 0;
      presentKeys.forEach(cat => {
        weightSum += weights[cat];
        weightedScore += weights[cat] * present[cat];
      });

      results.push({
        name: country.name,
        score: weightedScore / weightSum
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  function runRanking() {
    const weights = getWeights();
    const activeCats = Object.keys(weights).filter(k => weights[k] > 0);

    if (activeCats.length === 0) {
      resultsHead.innerHTML = '';
      resultsBody.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;

    const usePartial = partialToggle.checked;
    const ranked = computeRanking(countryData, weights, usePartial);
    renderResults(ranked.slice(0, 10), activeCats);
  }

  function renderResults(top10, activeCats) {
    resultsHead.innerHTML = '<th>#</th><th>country</th><th>score</th>';

    const max = top10.length ? Math.max(...top10.map(r => r.score)) : 0;

    let bodyHtml = '';
    top10.forEach((row, i) => {
      const pct = max > 0 ? Math.max(0, (row.score / max) * 100) : 0;
      bodyHtml += `<tr>
        <td>${i + 1}</td>
        <td class="country">${escapeHtml(row.name.toLowerCase())}</td>
        <td class="score-cell"><div class="score"><div class="bar"><i style="width:${pct.toFixed(1)}%"></i></div><b>${row.score.toFixed(2)}</b></div></td>
      </tr>`;
    });
    resultsBody.innerHTML = bodyHtml;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }
})();