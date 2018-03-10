let contents;

export const tippet = {
  element: function() {
    if($('Tippet')) {
      return $('Tippet');
    }
    else {
      const wrap = document.createElement('div');
      const tip = `<div id="Tippet" class="tippet">${contents}</div>`;
      wrap.innerHTML = tip;
      const newTip = wrap.childNodes[0];
      document.body.appendChild(newTip);
      return newTip;
    }
  },

  position: function(event) {
    const el = tippet.element();
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;
    const offPageRight = event.pageX + (el.offsetWidth + 10) > winWidth;
    const scrollNode = document.scrollingElement ? document.scrollingElement : document.body;
    const offPageBottom = (event.pageY - scrollNode.scrollTop) + (el.offsetHeight + 10) > winHeight;
    const style = `
      left: ${offPageRight ? -el.offsetWidth - 10 : 10}px;
      top: ${offPageBottom ? -el.offsetHeight - 10 : 10}px;
      transform: translate3d(${event.pageX}px, ${event.pageY}px, 0);
    `;
    el.setAttribute('style', style);
  },

  show: function() {
    tippet.element().style.display = 'inline-block';
    bindEvents();
  },

  hide: function() {
    tippet.element().style.display = 'none';
  },

  render: function() {
    var content = this.getAttribute('data-tippet');
    contents = content;
    tippet.element().innerHTML = contents;
    tippet.show();
  },

  init: function(setTheme) {
    bindEvents();
  },

  update: function() {
    bindEvents();
  }
};

var bindEvents = function() {
  const tippets = document.querySelectorAll('[data-tippet]');
  for (var i = 0; i < tippets.length; i++) {
    tippets[i].onmouseenter = tippet.render;
    tippets[i].onmousemove = tippet.position;
    tippets[i].onmouseleave = tippet.hide;
  }
};

tippet.init();
