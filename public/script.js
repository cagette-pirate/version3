/* Styles pour le système de modération simple */

/* Badge administrateur */
.admin-badge {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #c0392b;
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: var(--font-size-small);
  font-weight: bold;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  display: flex;
  align-items: center;
  gap: 8px;
}

.admin-badge i {
  margin-right: 4px;
}

.admin-logout {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 0;
  font-size: var(--font-size-regular);
}

.admin-logout:hover {
  color: #f7f7f7;
}

/* Lien d'administration dans la sidebar */
.admin-section {
  margin-bottom: var(--spacing-lg);
  text-align: center;
}

.admin-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  background-color: #34495e;
  color: white;
  border: none;
  border-radius: var(--border-radius-sm);
  padding: var(--spacing-md);
  font-size: var(--font-size-regular);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.admin-button:hover {
  background-color: #2c3e50;
  transform: translateY(-2px);
}

.admin-button i {
  margin-right: var(--spacing-sm);
}

/* Modal de connexion administrateur */
.admin-login-modal .modal-content {
  max-width: 400px;
}

.admin-login-modal .form-group {
  margin-bottom: var(--spacing-lg);
}

.admin-login-modal label {
  display: block;
  margin-bottom: var(--spacing-sm);
}

.admin-login-modal input {
  width: 100%;
  padding: var(--spacing-md);
  border: 1px solid var(--border);
  border-radius: var(--border-radius-sm);
}

.admin-login-button {
  background-color: var(--primary);
  color: white;
  border: none;
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.admin-login-button:hover {
  background-color: var(--primary-dark);
}

/* Boutons d'actions d'administration pour les commentaires */
.comment-admin-actions {
  margin-top: var(--spacing-sm);
  border-top: 1px solid var(--border);
  padding-top: var(--spacing-sm);
}

.delete-comment {
  background: none;
  border: 1px solid #c0392b;
  color: #c0392b;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--border-radius-sm);
  transition: all var(--transition-fast);
  font-size: var(--font-size-small);
}

.delete-comment:hover {
  background-color: #c0392b;
  color: white;
}

.delete-comment i {
  margin-right: 4px;
}

/* Toast supplémentaire pour les informations */
.toast.info {
  background-color: #3498db;
}