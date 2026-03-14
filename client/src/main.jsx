import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Polyfill for _.map to prevent crashes if something expects lodash
window._ = window._ || {};
window._.map = window._.map || function(collection, iteratee) {
  if (Array.isArray(collection)) return collection.map(iteratee);
  if (collection && typeof collection === 'object' && collection !== null) {
    return Object.keys(collection).map(key => iteratee(collection[key], key, collection));
  }
  return [];
};

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
