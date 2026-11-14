import { renderHeader } from './header.js';
import { mountSearchBar } from './searchbar.js';
import { icons } from './icons.js';

renderHeader();

document.querySelectorAll('[data-icon]').forEach(el => {
  const name = el.dataset.icon;
  el.outerHTML = icons[name](name === 'dice' ? 'icon' : 'icon cat-icon');
});

const festivalLink = document.getElementById('festival-link');

const updateLink = ({ from, to }) => {
  festivalLink.href = `/festivals.html?${new URLSearchParams({ from, to })}`;
};

const bar = mountSearchBar(document.getElementById('search-bar'), updateLink);
updateLink(bar.state); // 위치 확인 전에도 날짜는 링크에 반영
