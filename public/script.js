// Variables globales
let annonces = [];
let filteredAnnonces = [];
let currentPage = 1;
let itemsPerPage = 20;
let activeCategory = "alaune";
let activeDateFilter = "all";
let activeSortMethod = "date";
let sortByDateDesc = true;
let sortByViewsDesc = true;
let sortByLikesDesc = true;

// Éléments du DOM
const annoncesContainer = document.getElementById('annoncesContainer');
const spinner = document.getElementById('spinner');
const countAnnoncesElement = document.getElementById('countAnnonces');
const modal = document.getElementById('modal');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const sidebar = document.querySelector('.sidebar');

// Cache pour les vues, les likes et les commentaires
const viewsCache = {};
const likesCache = {};
const commentsCountCache = {};

// Initialisation de l'application
function initApp() {
  // Afficher le spinner pendant le chargement
  showSpinner();
  
  // Charger les données depuis l'API
  fetch('https://lacagette-coop.fr/?BazaR/json&demand=entries&id=76')
    .then(response => response.json())
    .then(data => {
      annonces = Object.values(data);
      console.log("Data loaded:", annonces.length, "entries");
      
      // Précharger toutes les données de vues et likes en une seule fois
      return Promise.all([
        loadAllViewsCounts(),
        loadAllLikesCounts()
      ]);
    })
    .then(() => {
      // Appliquer les filtres et tris initiaux
      applySortAndFilters();
    })
    .catch(error => {
      console.error("Error loading data:", error);
      hideSpinner();
      showToast("Erreur lors du chargement des données", "error");
    });
}

// Préchargement de toutes les données de vues
function loadAllViewsCounts() {
  const clicksRef = firebase.database().ref('clicks');
  return clicksRef.once('value')
    .then(snapshot => {
      const clicks = snapshot.val() || {};
      // Mettre en cache toutes les valeurs
      Object.keys(clicks).forEach(id => {
        viewsCache[id] = clicks[id];
      });
    });
}

// Préchargement de toutes les données de likes
function loadAllLikesCounts() {
  const likesRef = firebase.database().ref('likes');
  return likesRef.once('value')
    .then(snapshot => {
      const likes = snapshot.val() || {};
      // Mettre en cache toutes les valeurs
      Object.keys(likes).forEach(id => {
        likesCache[id] = likes[id];
      });
      
      // Après avoir chargé les likes, charger les compteurs de commentaires
      return loadAllCommentsCount();
    });
}

// Préchargement de tous les compteurs de commentaires
function loadAllCommentsCount() {
  const commentsRef = firebase.database().ref('comments');
  return commentsRef.once('value')
    .then(snapshot => {
      const comments = snapshot.val() || {};
      // Calculer le nombre de commentaires pour chaque annonce
      Object.keys(comments).forEach(annonceId => {
        const annonceComments = comments[annonceId] || {};
        commentsCountCache[annonceId] = Object.keys(annonceComments).length;
      });
    });
}

// Appliquer les filtres et tris
function applySortAndFilters() {
  // Réinitialiser la page actuelle
  currentPage = 1;
  
  // Appliquer les filtres
  filterAnnonces();
  
  // Appliquer le tri
  sortAnnonces();
  
  // Afficher les annonces
  displayAnnonces();
}

function filterAnnonces() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const now = new Date();
  
  // Calcul de la date de limite selon le filtre de date
  let dateLimit = new Date();
  switch(activeDateFilter) {
    case "month":
      dateLimit.setMonth(now.getMonth() - 1);
      break;
    case "3months":
      dateLimit.setMonth(now.getMonth() - 3);
      break;
    case "6months":
      dateLimit.setMonth(now.getMonth() - 6);
      break;
    case "year":
      dateLimit.setFullYear(now.getFullYear() - 1);
      break;
    default:
      dateLimit.setFullYear(now.getFullYear() - 10); // Pratiquement toutes les annonces
  }
  
  filteredAnnonces = annonces.filter(entry => {
    // Vérifier si l'annonce est modérée
    if (entry.bf_modo !== "1" && entry.bf_modo !== "10") return false;
    
    // Vérifier la catégorie
    const tags = entry.checkboxListeTagbf_checkbox_group.split(',');
    let matchesCategory = true;
    
    if (activeCategory === "alaune") {
      // Pour "À la une", chercher les annonces marquées par le comité de rédaction (bf_modo = 10)
      matchesCategory = entry.bf_modo === "10";
    } else if (activeCategory === "all") {
      // Pour "Toutes les publications", afficher toutes les annonces modérées
      matchesCategory = true;
    } else if (activeCategory) {
      // Pour les autres catégories, vérifier les tags normalement
      matchesCategory = tags.includes(activeCategory);
    }
    
    // Vérifier la date
    const entryDate = new Date(entry.date_maj_fiche);
    const isRecentEnough = entryDate >= dateLimit;
    
    // Vérifier les termes de recherche
    const matchesSearch = 
      entry.bf_titre.toLowerCase().includes(searchTerm) || 
      entry.bf_description.toLowerCase().includes(searchTerm) || 
      entry.bf_description1.toLowerCase().includes(searchTerm);
    
    return matchesCategory && isRecentEnough && matchesSearch;
  });
  
  // Mettre à jour le compteur d'annonces
  countAnnoncesElement.textContent = filteredAnnonces.length;
  
  // Mettre à jour la pagination
  updatePagination();
}

// Trier les annonces
function sortAnnonces() {
  switch(activeSortMethod) {
    case "random":
      filteredAnnonces.sort(() => Math.random() - 0.5);
      break;
      
    case "date":
      filteredAnnonces.sort((a, b) => {
        const dateA = new Date(a.date_creation_fiche);
        const dateB = new Date(b.date_creation_fiche);
        return sortByDateDesc ? dateB - dateA : dateA - dateB;
      });
      break;
      
    case "views":
      filteredAnnonces.sort((a, b) => {
        const viewsA = viewsCache[a.id_fiche] || 0;
        const viewsB = viewsCache[b.id_fiche] || 0;
        return sortByViewsDesc ? viewsB - viewsA : viewsA - viewsB;
      });
      break;
      
    case "likes":
      filteredAnnonces.sort((a, b) => {
        const likesA = likesCache[a.id_fiche] || 0;
        const likesB = likesCache[b.id_fiche] || 0;
        return sortByLikesDesc ? likesB - likesA : likesA - likesB;
      });
      break;
  }
}

// Afficher les annonces
function displayAnnonces() {
  showSpinner();
  
  // Fade out
  annoncesContainer.style.opacity = '0';
  
  setTimeout(() => {
    // Vider le conteneur
    annoncesContainer.innerHTML = '';
    
    // Calculer les indices de début et de fin pour la pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredAnnonces.length);
    
    // Afficher les annonces pour la page courante
    for (let i = startIndex; i < endIndex; i++) {
      const entry = filteredAnnonces[i];
      createAnnonceCard(entry);
    }
    
    // Fade in
    annoncesContainer.style.opacity = '1';
    hideSpinner();
  }, 300);
}

// Créer une carte d'annonce
function createAnnonceCard(entry) {
  const annonceDiv = document.createElement('div');
  annonceDiv.classList.add('annonce');
  annonceDiv.setAttribute('data-id', entry.id_fiche);
  
  // Formater la date
  const entryDate = new Date(entry.date_creation_fiche);
  const formattedDate = entryDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // Déterminer les tags de l'annonce
  const tagsArray = entry.checkboxListeTagbf_checkbox_group.split(',');
  const tagsMap = {
    "1": "Événement",
    "2": "Tribune",
    "3": "Recette",
    "4": "Info",
    "alaune": "À la une"
  };

  // Ajouter le tag "À la une" si l'annonce est mise en avant par le comité (bf_modo = 10)
  if (entry.bf_modo === "10" && !tagsArray.includes("alaune")) {
    tagsArray.push("alaune");
  }
  
  // Obtenir les vues, likes et commentaires
  const views = viewsCache[entry.id_fiche] || 0;
  const likes = likesCache[entry.id_fiche] || 0;
  const comments = commentsCountCache[entry.id_fiche] || 0;
  
  // Vérifier si l'annonce est likée
  const likedAnnonces = JSON.parse(localStorage.getItem('likedAnnonces')) || {};
  const isLiked = likedAnnonces[entry.id_fiche];
  
  // Déterminer l'auteur
  const author = entry.bf_pseudo ? entry.bf_pseudo : (entry.bf_description2 || 'Anonyme') + ' ' + (entry.bf_description1 || '');
  
  // Créer le HTML pour la carte
  annonceDiv.innerHTML = `
    <div class="annonce-image ${!entry.fichierbf_file ? 'no-image-container' : ''}">
      ${entry.fichierbf_file 
        ? `<img src="https://lacagette-coop.fr/files/${entry.fichierbf_file}" alt="${entry.bf_titre}" loading="lazy">`
        : `<div class="title-placeholder">${entry.bf_titre}</div>`
      }
    </div>
    <div class="annonce-content">
      <div class="annonce-tags">
        ${tagsArray.map(tag => `<span class="annonce-tag">${tagsMap[tag] || tag}</span>`).join('')}
      </div>
      <h2>${entry.bf_titre}</h2>
      <p class="author">${author}</p>
      <p class="date"><i class="far fa-calendar-alt"></i> ${formattedDate}</p>
      <p class="excerpt">${entry.bf_description.substring(0, 150)}${entry.bf_description.length > 150 ? '...' : ''}</p>
      <div class="interaction-buttons">
        <div class="button-group">
          <button class="like-button ${isLiked ? 'active' : ''}" data-id="${entry.id_fiche}">
            <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
            <span class="likes-count">${likes}</span>
          </button>
          <div class="comments-indicator" title="${comments} commentaire(s)">
            <i class="far fa-comment"></i>
            <span class="comments-count">${comments}</span>
          </div>
        </div>
        <div class="views-display">
          <i class="fas fa-eye"></i>
          <span class="views-count">${views}</span>
        </div>
      </div>
    </div>
  `;
  
  // Ajouter les écouteurs d'événements
  annonceDiv.querySelector('h2').addEventListener('click', () => openModal(entry));
  annonceDiv.querySelector('.annonce-image').addEventListener('click', () => openModal(entry));
  annonceDiv.querySelector('.comments-indicator').addEventListener('click', () => openModal(entry));
  
  // Bouton "J'aime"
  const likeButton = annonceDiv.querySelector('.like-button');
  likeButton.addEventListener('click', () => toggleLike(entry.id_fiche, likeButton));
  
  // Ajouter la carte au conteneur
  annoncesContainer.appendChild(annonceDiv);
}

// Mettre à jour la pagination
function updatePagination() {
  const paginationContainer = document.getElementById('pagination');
  paginationContainer.innerHTML = '';
  
  const totalPages = Math.ceil(filteredAnnonces.length / itemsPerPage);
  
  if (totalPages <= 1) {
    // Pas besoin de pagination si une seule page
    return;
  }
  
  // Ajouter le bouton précédent
  const prevButton = document.createElement('button');
  prevButton.classList.add('pagination-button');
  prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevButton.disabled = currentPage === 1;
  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      displayAnnonces();
      updatePaginationButtons();
    }
  });
  paginationContainer.appendChild(prevButton);
  
  // Calculer les pages à afficher
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Ajuster si on est près de la fin
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // Afficher la première page si nécessaire
  if (startPage > 1) {
    const firstPageButton = document.createElement('button');
    firstPageButton.classList.add('pagination-button');
    firstPageButton.textContent = '1';
    firstPageButton.addEventListener('click', () => {
      currentPage = 1;
      displayAnnonces();
      updatePaginationButtons();
    });
    paginationContainer.appendChild(firstPageButton);
    
    if (startPage > 2) {
      const ellipsis = document.createElement('span');
      ellipsis.classList.add('pagination-ellipsis');
      ellipsis.textContent = '...';
      paginationContainer.appendChild(ellipsis);
    }
  }
  
  // Afficher les pages
  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement('button');
    pageButton.classList.add('pagination-button');
    if (i === currentPage) {
      pageButton.classList.add('active');
    }
    pageButton.textContent = i;
    pageButton.addEventListener('click', () => {
      currentPage = i;
      displayAnnonces();
      updatePaginationButtons();
    });
    paginationContainer.appendChild(pageButton);
  }
  
  // Afficher la dernière page si nécessaire
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const ellipsis = document.createElement('span');
      ellipsis.classList.add('pagination-ellipsis');
      ellipsis.textContent = '...';
      paginationContainer.appendChild(ellipsis);
    }
    
    const lastPageButton = document.createElement('button');
    lastPageButton.classList.add('pagination-button');
    lastPageButton.textContent = totalPages;
    lastPageButton.addEventListener('click', () => {
      currentPage = totalPages;
      displayAnnonces();
      updatePaginationButtons();
    });
    paginationContainer.appendChild(lastPageButton);
  }
  
  // Ajouter le bouton suivant
  const nextButton = document.createElement('button');
  nextButton.classList.add('pagination-button');
  nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      displayAnnonces();
      updatePaginationButtons();
    }
  });
  paginationContainer.appendChild(nextButton);
}

// Mettre à jour les boutons de pagination
function updatePaginationButtons() {
  const buttons = document.querySelectorAll('.pagination-button');
  buttons.forEach(button => {
    if (button.textContent == currentPage) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Ouvrir le modal avec les détails de l'annonce
function openModal(entry) {
  // Incrémenter le compteur de vues
  increaseViewCount(entry.id_fiche);
  
  // Formater la date
  const entryDate = new Date(entry.date_creation_fiche);
  const formattedDate = entryDate.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  
  // Déterminer les tags de l'annonce
  const tagsArray = entry.checkboxListeTagbf_checkbox_group.split(',');
  const tagsMap = {
    "1": "Événement",
    "2": "Tribune",
    "3": "Recette",
    "4": "Info",
    "alaune": "À la une"
  };

  // Ajouter le tag "À la une" si l'annonce est mise en avant par le comité (bf_modo = 10)
  if (entry.bf_modo === "10" && !tagsArray.includes("alaune")) {
    tagsArray.push("alaune");
  }
  
  // Vérifier si l'annonce est likée
  const likedAnnonces = JSON.parse(localStorage.getItem('likedAnnonces')) || {};
  const isLiked = likedAnnonces[entry.id_fiche];
  
  // Déterminer l'auteur
  const author = entry.bf_pseudo ? entry.bf_pseudo : (entry.bf_description2 || 'Anonyme') + ' ' + (entry.bf_description1 || '');
  
  // Remplir le modal avec les détails
  document.querySelector('.modal-title').textContent = entry.bf_titre;
  document.querySelector('.modal-author').textContent = author;
  document.querySelector('.modal-date span').textContent = formattedDate;
  
  // Gestion de l'image ou du placeholder
  const modalImage = document.querySelector('.modal-image');
  
  // Supprimer le placeholder précédent s'il existe
  const existingPlaceholder = document.querySelector('.title-placeholder-modal');
  if (existingPlaceholder) {
    existingPlaceholder.remove();
  }
  
  if (entry.fichierbf_file) {
    modalImage.src = `https://lacagette-coop.fr/files/${entry.fichierbf_file}`;
    modalImage.alt = entry.bf_titre;
    modalImage.style.display = 'block';
  } else {
    modalImage.style.display = 'none';
    
    // Créer le placeholder avec le titre
    const placeholderDiv = document.createElement('div');
    placeholderDiv.className = 'title-placeholder-modal';
    placeholderDiv.textContent = entry.bf_titre;
    
    // Insérer après l'image dans le modal
    const modalContent = document.querySelector('.modal-content');
    modalContent.insertBefore(placeholderDiv, document.querySelector('.modal-body'));
  }
  
  // Afficher les tags
  const modalTags = document.querySelector('.modal-tags');
  modalTags.innerHTML = '';
  tagsArray.forEach(tag => {
    const tagSpan = document.createElement('span');
    tagSpan.classList.add('modal-tag');
    tagSpan.textContent = tagsMap[tag] || tag;
    modalTags.appendChild(tagSpan);
  });
  
  // Afficher la description
  document.querySelector('.modal-description').innerHTML = entry.bf_description.replace(/\n\r?/g, '<br>');
  document.querySelector('.num-annonce').textContent = `Numéro d'annonce : ${entry.date_creation_fiche}`;
  
  // Afficher les vues
  document.querySelector('.modal-content .views-count').textContent = viewsCache[entry.id_fiche] || 0;
  
  // Mettre à jour les boutons d'action
  const modalLikeButton = document.querySelector('.modal-like-button');
  modalLikeButton.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> J'aime`;
  modalLikeButton.onclick = () => toggleLike(entry.id_fiche, modalLikeButton);
  
  // Charger les commentaires
  loadComments(entry.id_fiche);
  
  // Configurer le formulaire de commentaire
  const commentForm = document.querySelector('.comment-form');
  commentForm.onsubmit = (e) => {
    e.preventDefault();
    const commentText = document.getElementById('commentInput').value.trim();
    if (commentText) {
      addComment(entry.id_fiche, commentText);
    }
  };
  
  document.getElementById('submitComment').onclick = () => {
    const commentText = document.getElementById('commentInput').value.trim();
    if (commentText) {
      addComment(entry.id_fiche, commentText);
    }
  };
  
  // Afficher le modal
  modal.style.display = 'block';
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
}

// Fermer le modal
function closeModal() {
  modal.classList.remove('active');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
}

// Incrémenter le compteur de vues
function increaseViewCount(annonceId) {
  const clickRef = firebase.database().ref('clicks/' + annonceId);
  clickRef.transaction(currentClicks => {
    const newValue = (currentClicks || 0) + 1;
    viewsCache[annonceId] = newValue;
    
    // Mettre à jour l'affichage des vues dans le modal si ouvert
    if (modal.style.display === 'block') {
      document.querySelector('.modal-content .views-count').textContent = newValue;
    }
    
    return newValue;
  });
}

// Toggle Like
function toggleLike(annonceId, button) {
  const likedAnnonces = JSON.parse(localStorage.getItem('likedAnnonces')) || {};
  const isLiked = likedAnnonces[annonceId];
  
  if (isLiked) {
    // Unlike
    const likesRef = firebase.database().ref('likes/' + annonceId);
    likesRef.transaction(currentLikes => {
      const newValue = Math.max(0, (currentLikes || 0) - 1);
      likesCache[annonceId] = newValue;
      return newValue;
    }, (error, committed, snapshot) => {
      if (committed) {
        delete likedAnnonces[annonceId];
        localStorage.setItem('likedAnnonces', JSON.stringify(likedAnnonces));
        
        // Mettre à jour l'UI
        updateLikeButtons(annonceId, false);
        showToast("Je n'aime plus");
      }
    });
  } else {
    // Like
    const likesRef = firebase.database().ref('likes/' + annonceId);
    likesRef.transaction(currentLikes => {
      const newValue = (currentLikes || 0) + 1;
      likesCache[annonceId] = newValue;
      return newValue;
    }, (error, committed, snapshot) => {
      if (committed) {
        likedAnnonces[annonceId] = true;
        localStorage.setItem('likedAnnonces', JSON.stringify(likedAnnonces));
        
        // Mettre à jour l'UI
        updateLikeButtons(annonceId, true);
        showToast("J'aime !");
      }
    });
  }
}

// Mettre à jour tous les boutons like pour une annonce
function updateLikeButtons(annonceId, isLiked) {
  // Mettre à jour dans les cartes
  const cardLikeButton = document.querySelector(`.annonce[data-id="${annonceId}"] .like-button`);
  if (cardLikeButton) {
    cardLikeButton.classList.toggle('active', isLiked);
    cardLikeButton.querySelector('i').className = isLiked ? 'fas fa-heart' : 'far fa-heart';
    cardLikeButton.querySelector('.likes-count').textContent = likesCache[annonceId] || 0;
  }
  
  // Mettre à jour dans le modal
  if (modal.style.display === 'block') {
    const modalLikeButton = document.querySelector('.modal-like-button');
    modalLikeButton.innerHTML = `<i class="${isLiked ? 'fas' : 'far'} fa-heart"></i> J'aime`;
  }
}

// Ajouter une fonction pour mettre à jour le titre du H3 dans la section commentaires
function updateCommentsTitle(annonceId) {
  const commentCount = commentsCountCache[annonceId] || 0;
  const commentsTitle = document.querySelector('.comments-section h3');
  
  if (commentsTitle) {
    commentsTitle.textContent = commentCount > 0 
      ? `Commentaires (${commentCount})` 
      : 'Commentaires';
  }
}

// Charger les commentaires
function loadComments(annonceId) {
  const commentsRef = firebase.database().ref('comments/' + annonceId);
  const commentsList = document.getElementById('commentsList');
  commentsList.innerHTML = '';
  
  // Mettre à jour le titre avec le nombre de commentaires
  updateCommentsTitle(annonceId);
  
  commentsRef.orderByChild('timestamp').once('value', snapshot => {
    const comments = snapshot.val();
    if (!comments) {
      const noCommentsMessage = document.createElement('p');
      noCommentsMessage.textContent = "Aucun commentaire pour le moment. Soyez le premier à partager votre avis !";
      noCommentsMessage.className = "no-comments";
      commentsList.appendChild(noCommentsMessage);
      return;
    }
    
    // Mettre à jour le compteur dans le cache
    const commentCount = Object.keys(comments).length;
    commentsCountCache[annonceId] = commentCount;
    
    // Mettre à jour le titre avec le nombre de commentaires actualisé
    updateCommentsTitle(annonceId);
    
    // Convertir l'objet en tableau et trier par date
    const commentsArray = Object.values(comments);
    commentsArray.sort((a, b) => b.timestamp - a.timestamp);
    
    commentsArray.forEach(comment => {
      const commentElement = document.createElement('div');
      commentElement.className = 'comment';
      
      // Formater la date du commentaire
      const commentDate = new Date(comment.timestamp);
      const formattedDate = commentDate.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      commentElement.innerHTML = `
        <div class="comment-header">
          <span class="comment-author">${comment.author || 'Anonyme'}</span>
          <span class="comment-date">${formattedDate}</span>
        </div>
        <div class="comment-content">${comment.text}</div>
      `;
      
      commentsList.appendChild(commentElement);
    });
  });
}

// Ajouter un commentaire
function addComment(annonceId, commentText) {
  // Générer un ID unique pour le commentaire
  const commentId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  
  // Créer l'objet commentaire
  const comment = {
    id: commentId,
    author: "Visiteur", // Pourrait être remplacé par un nom saisi par l'utilisateur
    text: commentText,
    timestamp: Date.now()
  };
  
  // Sauvegarder dans Firebase
  const commentRef = firebase.database().ref('comments/' + annonceId + '/' + commentId);
  commentRef.set(comment)
    .then(() => {
      // Réinitialiser le champ de texte
      document.getElementById('commentInput').value = '';
      
      // Mettre à jour le cache
      commentsCountCache[annonceId] = (commentsCountCache[annonceId] || 0) + 1;
      
      // Recharger les commentaires
      loadComments(annonceId);
      
      // Afficher un message de confirmation
      showToast("Commentaire ajouté");
    })
    .catch(error => {
      console.error("Erreur lors de l'ajout du commentaire:", error);
      showToast("Erreur lors de l'ajout du commentaire", "error");
    });
}

// Fonctions utilitaires

// Afficher le spinner
function showSpinner() {
  spinner.style.display = 'block';
}

// Cacher le spinner
function hideSpinner() {
  spinner.style.display = 'none';
}

// Afficher un toast
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast';
  
  // Ajouter une classe selon le type de message
  if (type === 'error') {
    toast.classList.add('error');
  } else {
    toast.classList.add('success');
  }
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Mise en place des écouteurs d'événements

// Filtres de catégories
document.querySelectorAll('.tag-filter').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tag-filter').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    activeCategory = button.getAttribute('data-tag');
    applySortAndFilters();
  });
});

// Filtre de date
document.getElementById('dateFilter').addEventListener('change', function() {
  activeDateFilter = this.value;
  applySortAndFilters();
});

// Recherche
document.getElementById('searchInput').addEventListener('input', debounce(function() {
  applySortAndFilters();
}, 300));

// Tri au hasard
document.getElementById('sortByRandomBtn').addEventListener('click', function() {
  document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
  this.classList.add('active');
  activeSortMethod = 'random';
  applySortAndFilters();
});

// Tri par date
document.getElementById('sortByDateBtn').addEventListener('click', function() {
  document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
  this.classList.add('active');
  activeSortMethod = 'date';
  sortByDateDesc = !sortByDateDesc;
  applySortAndFilters();
});

// Tri par vues
document.getElementById('sortByViewsBtn').addEventListener('click', function() {
  document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
  this.classList.add('active');
  activeSortMethod = 'views';
  sortByViewsDesc = !sortByViewsDesc;
  applySortAndFilters();
});
    
// Tri par likes
document.getElementById('sortByLikesBtn').addEventListener('click', function() {
  document.querySelectorAll('.sort-button').forEach(btn => btn.classList.remove('active'));
  this.classList.add('active');
  activeSortMethod = 'likes';
  sortByLikesDesc = !sortByLikesDesc;
  applySortAndFilters();
});
    
// Fermeture du modal
document.querySelector('#modal .close').addEventListener('click', closeModal);
window.addEventListener('click', (event) => {
  if (event.target == modal) closeModal();
});
window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal.style.display === 'block') closeModal();
});
    
// Toggle menu mobile
mobileMenuToggle.addEventListener('click', () => {
  sidebar.classList.toggle('active');
});
    
// Fonction debounce pour éviter trop d'appels pendant la frappe
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      func.apply(context, args);
    }, wait);
  };
}
    
// Vérification des changements de taille de la fenêtre
window.addEventListener('resize', debounce(function() {
  // Adapter la pagination en fonction de la taille de l'écran
  if (window.innerWidth < 768) {
    itemsPerPage = 4;
  } else {
    itemsPerPage = 8;
  }
  updatePagination();
  displayAnnonces();
}, 200));
    
// Lazy loading des images avec Intersection Observer
let lazyImageObserver;
function setupLazyLoading() {
  if ('IntersectionObserver' in window) {
    lazyImageObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const lazyImage = entry.target;
          lazyImage.src = lazyImage.dataset.src;
          lazyImage.classList.remove('lazy');
          lazyImageObserver.unobserve(lazyImage);
        }
      });
    });
        
    document.querySelectorAll('img.lazy').forEach(function(lazyImage) {
      lazyImageObserver.observe(lazyImage);
    });
  } else {
    // Fallback pour les navigateurs qui ne supportent pas Intersection Observer
    document.querySelectorAll('img.lazy').forEach(function(lazyImage) {
      lazyImage.src = lazyImage.dataset.src;
      lazyImage.classList.remove('lazy');
    });
  }
}
    
// Cacher automatiquement la sidebar sur mobile lors du clic sur un filtre
document.querySelectorAll('.sidebar button').forEach(button => {
  button.addEventListener('click', () => {
    if (window.innerWidth < 600) {
      setTimeout(() => {
        sidebar.classList.remove('active');
      }, 300);
    }
  });
});

// Gestion du modal À propos
const aboutButton = document.getElementById('aboutButton');
const aboutModal = document.getElementById('aboutModal');
const closeAboutModal = document.getElementById('closeAboutModal');

// Ouvrir le modal
aboutButton.addEventListener('click', () => {
  // Forcer le titre du modal À propos
  document.querySelector('#aboutModal .modal-title').textContent = "À propos de la Cagette Pirate";
  
  aboutModal.style.display = 'block';
  setTimeout(() => {
    aboutModal.classList.add('active');
  }, 10);
});

// Fermer le modal en cliquant sur la croix
closeAboutModal.addEventListener('click', () => {
  aboutModal.classList.remove('active');
  setTimeout(() => {
    aboutModal.style.display = 'none';
  }, 300);
});

// Fermer le modal en cliquant en dehors du contenu
window.addEventListener('click', (event) => {
  if (event.target === aboutModal) {
    aboutModal.classList.remove('active');
    setTimeout(() => {
      aboutModal.style.display = 'none';
    }, 300);
  }
});
    
// Initialiser l'application au chargement
document.addEventListener('DOMContentLoaded', () => {
  // Sélectionner le tri par défaut
  document.getElementById('sortByDateBtn').classList.add('active');

  // Démarrer l'application
  initApp();
});