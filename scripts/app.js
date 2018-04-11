const $ = (id) => {
  return document.querySelector(id);
};
const ENTRY = $('#entry');
const CONTENT = $('#detailContent');
const LISTING = $('#listing');
const META = $('#detailMeta');
const URL_REGEX = /^[^\[(.*?)\]]((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;

const KEYS_PRESSED = [];

const DOC_VARS = [];
const EMOJIS = (() => {
  const result = [];
  for(let emoji in emojis) {
    result.push(emoji);
  }
  return result;
})();

let noteslocal = [];
let noteIndex = 0;
let selectedMessageIndex = null;
let injectLine;
let dragging = false;
let dragStartX;
let dragStartY;
let shifted = false;

const scrollToBottom = () => {
  $('.detail').scrollTop += 15000;
};

const escapeRegExp = (str) =>
  str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

const replaceAll = (str, find, replace) =>
  str.replace(new RegExp(escapeRegExp(find), 'g'), replace);

const randomString = (length) =>
  Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);

const sprintf = (format, ...args) => {
    let i = 0;
    return format.replace(/%s/g, () => args[i++]);
};

const setLightTheme = () => {
  document.body.classList = 'light-theme';
  localforage.setItem('theme', 'light-theme');
  $('#themeLight').checked = true;
};

const setDarkTheme = () => {
  document.body.classList = 'dark-theme';
  localforage.setItem('theme', 'dark-theme');
  $('#themeDark').checked = true;
};

const getThumbnail = (site, callback) => {
  const API = `https://api.letsvalidate.com/v1/thumbs/?url=${site}&output=json`;
  const APItech = `https://api.letsvalidate.com/v1/technologies/?url=${site}&output=json`;
  let url;
  fetch(APItech).then(function(response) {
    return response.json();
  }).then(function(respa) {
    url = respa.urls[0];
    fetch(API).then(function(response) {
      return response.json();
    }).then(function(resp) {
      return callback(resp.base64, url);
    }).catch(error => {
      callback(false);
    });
  }).catch(error => {
    callback(false);
  });
};

var rgxFindMatchPos = function (str, left, right, flags) {
  'use strict';
  var f = flags || '',
      g = f.indexOf('g') > -1,
      x = new RegExp(left + '|' + right, 'g' + f.replace(/g/g, '')),
      l = new RegExp(left, f.replace(/g/g, '')),
      pos = [],
      t, s, m, start, end;

  do {
    t = 0;
    while ((m = x.exec(str))) {
      if (l.test(m[0])) {
        if (!(t++)) {
          s = x.lastIndex;
          start = s - m[0].length;
        }
      } else if (t) {
        if (!--t) {
          end = m.index + m[0].length;
          var obj = {
            left: {start: start, end: s},
            match: {start: s, end: m.index},
            right: {start: m.index, end: end},
            wholeMatch: {start: start, end: end}
          };
          pos.push(obj);
          if (!g) {
            return pos;
          }
        }
      }
    }
  } while (t && (x.lastIndex = s));

  return pos;
};

const createElement = (markup) =>
  document.createRange().createContextualFragment(markup);

const blocks = {
  rule: {
    regex: /^\---/,
    wrap: () =>
      `<hr>`
  },
  sparkline: {
    regex: /\~\[(.*?)\]\~/,
    wrap: (res) => {
      const d = ['M 0 0'];
      const data = res.split(',');
      const width = 400;
      const height = 100;
      for(var i = 0; i < data.length; i++) {
        const y = (data[i]- Math.min(...data))/(Math.max(...data) - Math.min(...data));
        let letter = i > 0 ? 'L' : 'M';
        d.push(`${letter} ${i*(width/data.length)} ${y * height}`);
      }
      return `
        <svg width="100%" height="80px" viewBox="0 0 ${width} ${height + 1}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <path id="sparkLine" d="${d}" fill="transparent" stroke-width="1"/>
        </svg>`;
    }
  },
  variable: {
    regex: /\$(.*?)\=(.*?)\;/,
    wrap: (res, additional) => {
      DOC_VARS.push({
        name: '$'+res.trim(),
        val: additional.trim()
      });
      return `<pre class="var-pre code"><span class="var-name">$${res.trim()}</span> =<span class="var-val"> ${additional.trim()}</span></pre>`;
    }
  },
  preformatted: {
    regex: /`{3}([\S\s]*?)`{3}/m,
    wrap: (res) => {
      const lang = detectLang(res);
      const id = randomString(12);
      Rainbow.color(res, lang, (highlightedCode) => {
        const el = document.querySelector(`[data-async-id="${id}"]`);
        el.setAttribute('data-language', lang);
        el.innerHTML = highlightedCode;
      });
      return `<pre data-async-id="${id}">${res}</pre>`;
    }
  },
  important: {
    regex: /^\? ([\s\S]*$)/,
    wrap: res => {
      return `<div class="idea"><span class="star">★</span> ${res}</div>`;
    }
  },
  quote: {
    regex: /^\> ([\s\S]*$)/,
    wrap: res =>
      res
  },
  list: {
    regex: /^\* ([\s\S]*$)/,
    wrap: res =>
      res
  },
  checkbox: {
    regex: /^\[ ]|\[x]([\s\S]*$)/,
    wrap: (res) => {
      const id = randomString(10);
      return `
        <input id="${id}" type="checkbox"/>
        <label for="${id}">${res}</label>`;
    }
  },
  header: {
    regex: /(#+\s)([\s\S]*$)/i,
    wrap: (res, additional) => {
      let count = res.length;
      tag = `h${count - 1}`;
      return `<${tag}>${additional.trim()}</${tag}>`;
    }
  },
  math: {
    regex: /\{(.*?)\}/,
    wrap: (res) => {
      return `<pre class='code'><span class="comment">${res}</span> <br>${math.eval(res)}</pre>`;
    }
  },
  url: {
    regex: URL_REGEX,
    wrap: (res) => {
      res = 'h'+res;
      const id = randomString(12);
      getThumbnail(res, (src, url) => {
        let result;
        const message = document.querySelector(`[data-async-id="${id}"]`);
        if(url) {
          if(url) {
            message.querySelector('img').setAttribute('src', `data:image/jpeg;base64,${src}`);
          }
          else {
            message.querySelector('img').style.display = 'none';
          }
          message.querySelector('a').setAttribute('href', url);
          message.querySelector('p').innerText = url;
        }
        else {
          const fillin = () => {
            res = res.includes('http') ? res : `http://${res}`;
            message.querySelector('a').setAttribute('href', res);
            message.querySelector('p').innerText = res;
          };
          fillin();
        }
        message.classList.remove('dummy-link-loader');
      });
      return `
        <div data-async-id=${id} class="message url dummy-link-loader">
        <div class="handle">▶</div>
          <div class="m-c">
            <a target="_blank">
              <img src="">
              <p>${res}</p>
            </a>
          </div>
        </div>`;
    }
  }
};

const inlines = {
  bold: {
    regex: /\*(.*?)\*/,
    wrap: (res) =>
      `<b>${res}</b>`,
  },
  emoji: {
    regex: /\:(.*?)\:/,
    wrap: (res) =>
      emojis[res] || res,
  },
  italic: {
    regex: /\_(.*?)\_/,
    wrap: (res) =>
      `<i>${res}</i>`,
  },
  code: {
    regex: /`(.*?)`/,
    wrap: (res) =>
      `<pre class="inline-code">${res}</pre>`,
  },
  hexcode: {
    regex: /#(?:[0-9a-fA-F]{3}){1,2}/i,
    wrap: (res) =>
      `<div class="inline-hexcode">
        <div class="hexcode-wrap"><div class="color-swatch" style="background-color: ${res}"></div>${res}</div>
      </div>`
  },
  api: {
    regex: /\@\[([^\[]+)\]\(([^\)]+)\)/,
    /* jshint ignore:start */
    wrap: async (res, additional) => {
      const id = randomString(12);
      const resp = await fetch(`${res}`);
      let json = await resp.json();
      const path = additional.split('.');
      const result = path.map(p => {
        json = json[p];
        return json;
      })[0];
      return result;
    }
    /* jshint ignore:end */
  },
  link: {
    regex: /\[([^\[]+)\]\(([^\)]+)\)/,
    wrap: (res, additional) =>
      `<a href="${additional}">${res}</a>`
  },
};

/* jshint ignore:start */
const wrap = async (content, format) => {
  let styled = content;
  const matches = [];
  for(let style in format) {
    const inlines = format.bold;
    const regex = inlines ? new RegExp(format[style].regex, 'g') : format[style].regex;
    content.replace(regex, match => {
      const exec = format[style].regex.exec(match);
      matches.push({
        stripped: exec[1],
        unstripped: exec[0],
        additional: exec[2] || undefined,
        style: style
      });
    });
  }
  await asyncForEach(matches, async match => {
    const style = format[match.style];
    const output = await style.wrap(match.stripped || match.unstripped, match.additional);
    styled = styled.replace(match.unstripped, output);
  });
  return styled;
};
/* jshint ignore:end */

const getType = (content) => {
  for(let type in blocks) {
    if(blocks[type].regex.test(content)) {
      return type;
    }
  }
  return false;
};

const fillInVars = (content) => {
  DOC_VARS.forEach(vbl => {
    content = replaceAll(content, vbl.name, vbl.val);
  });
  return content;
};

/* jshint ignore:start */
const message = async (content) => {
  let failsafe = 0;
  const isVar = blocks.variable.regex.test(content);
  content = DOC_VARS.length > 0 && !isVar ? fillInVars(content) : content;
  let type = getType(content);
  content = await wrap(content, blocks);
  if(type !== 'preformatted' && type !== 'math' && type !== 'sparkline' && type !== 'url') {
    content = await wrap(content, inlines);
  }
  if(type !== 'url') {
    return `<div class="message ${type ? type : 'text'}"><div class="handle">▶</div><div class="m-c">${content}</div></div>`;
  }
  else{
    return content;
  }
};

const enterMessage = async () => {
  const content = ENTRY.value;
  const id = selectedMessageIndex ? noteslocal[noteIndex].messages[selectedMessageIndex].id : randomString(12);
  const type = getType(content) || 'none';
  const result = await message(content);
  recordEntry(content, type, id);
  renderMessage(result, type, id);
  ENTRY.value = type === 'list' ? '* ' : '';
};

const recordEntry = (content, type, id) => {
  const editing = selectedMessageIndex >= 0 && document.querySelector('.message-selected');

  localforage.getItem('notes').then(notes => {
    if(!notes) {
      const note = {
        exerpt: CONTENT.querySelector('.message:first-child .m-c *:first-child').innerText,
        created: new Date(),
        messages: [{
          id: id,
          content: content,
          type: type
        }]
      };
      localforage.setItem('notes', [note]);
      noteslocal = [note];
      renderNotes([note]);
    }
    else {
      if(editing === null) {
        const messageData = {
          id: id,
          content: content,
          type: type
        }
        if(injectLine) {
          const injectIndex = [...document.querySelectorAll('.message')].indexOf($(injectLine));
          noteslocal[noteIndex].messages.splice(injectIndex - 1, 0, messageData);
        }
        else {
          noteslocal[noteIndex].messages.push(messageData);
        }
      }
      else {
        noteslocal[noteIndex].messages[selectedMessageIndex].content = content;
        selectedMessageIndex = null;
      }
      injectLine = null;
      save();
    }
    if(type === 'variable') {
      showNoteDetail(noteIndex);
    }
  });
}
/* jshint ignore:end */

const save = () => {
  let note = {
    exerpt: CONTENT.querySelector('.message:first-child .m-c').innerText,
    messages: noteslocal[noteIndex].messages
  };
  noteslocal[noteIndex] = note;
  localforage.setItem('notes', noteslocal);
};

const createTimeStamp = (date) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  const days = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
  const now = date || new Date();
  const timestamp = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()} ${now.getYear() + 1900}`;
  return timestamp;
};

const newNote = () => {
  let note = {
    exerpt: 'New Note',
    created: new Date(),
    messages: []
  };
  noteslocal.unshift(note);
  renderNoteListing(noteslocal);
  showNoteDetail(0);
};

const styleSelectedNote = (index) => {
  const notes = LISTING.querySelectorAll('li');
  notes.forEach(note => {
    note.classList.remove('selected');
  });
  notes[index].classList.add('selected');
};

const getMessageById = (id) => {
  let result;
  noteslocal[noteIndex].messages.forEach(note => {
    if(note.id === id) {
      result = note;
    }
  });
  return result;
};

const getMessage = (e) => {
  let el = e.target || e;
  if(!el.classList.contains('message')){
    while ((el = el.parentElement) && !el.classList.contains('message'));
  }
  return el;
};

const insertInjectLine = (e) => {
  const el = getMessage(e);
  const hr = createElement(`<div class="inject-line"></div>`);
  injectLine = el.getAttribute('id');
  CONTENT.insertBefore(hr, el);
  ENTRY.focus();
};

const selectMessage = (e) => {
  let el = getMessage(e) || e;
  const id = el.getAttribute('id');
  const note = getMessageById(id);
  ENTRY.value = note.content;
  ENTRY.focus();
  el.classList.add('message-selected');
  fitEntryContent();
  selectedMessageIndex = noteslocal[noteIndex].messages.indexOf(note);
};

/* jshint ignore:start */
const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

const reorder = (e) => {
  const x = e.pageX - dragStartX;
  const y = e.pageY - dragStartY;
  getMessage(e).setAttribute('id', 'dragging');
  getMessage(e).setAttribute('style', `
    transform: translate3d(${x}px,${y}px,0);
    opacity: 0.5;
    position:relative;
    z-index: 99999999;`)
}

const renderMessage = async (result, type, id) => {
  const editing = selectedMessageIndex >= 0 && document.querySelector('.message-selected');
  const element = createElement(result);
  element.querySelector('.message').setAttribute('id', id);
  bindMessageEvents(element);

  if(editing) {
    const sibling = document.querySelector(`.message:nth-child(${selectedMessageIndex + 2})`);
    document.querySelector(`.message:nth-child(${selectedMessageIndex + 1})`).remove();
    CONTENT.insertBefore(element, sibling);
  }
  else if(injectLine) {
    let before = $('#'+injectLine);
    document.querySelector('.inject-line').remove();
    CONTENT.insertBefore(element, before);
  }
  else {
    CONTENT.appendChild(element);
    scrollToBottom();
  }
}

const renderMessages = (index) => {
  const messages = noteslocal[index].messages;
  CONTENT.innerHTML = '';
  if(messages.length > 0) {
    asyncForEach(noteslocal[index].messages, async (note) => {
      let result = await message(note.content);
      renderMessage(result, note.type, note.id);
    });
  }
}
/* jshint ignore:end */

const renderNoteMetaData = (index) => {
  const date = noteslocal[index].created;
  console.log(noteslocal[index]);
  META.querySelector('.time-stamp').innerHTML = createTimeStamp(date);
};

const showNoteDetail = (index) => {
  noteIndex = index;
  DOC_VARS.length = 0;
  renderMessages(index);
  renderNoteMetaData(index);
  styleSelectedNote(index);
  ENTRY.focus();
};

const deleteNote = (index) => {
  noteslocal.splice(index, 1);
  localforage.setItem('notes', noteslocal);
  renderNoteListing(noteslocal);
  showNoteDetail(index);
};

const renderNoteListing = (notes) => {
  LISTING.innerHTML = '';
  notes.forEach((note, index) => {
    const listing = `<li onclick="showNoteDetail(${index})"><span>${note.exerpt.replace('▶', '')}</span></li>`;
    LISTING.innerHTML += listing;
  });
};

const noNotesYet = () => {
  localforage.getItem('notes').then(notes => {
    if(notes) {
      return false;
    }
    else {
      return true;
    }
  });
};

const loadNotes = () => {
  localforage.getItem('notes').then(notes => {
    if(notes) {
      noteslocal = notes;
      renderNoteListing(noteslocal);
      showNoteDetail(0);
    }
    else {
      noteslocal.push(basics);
      newNote();
      save();
    }
  });
};

const deleteMessage = () => {
  CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex + 1})`).remove();
  noteslocal[noteIndex].messages.splice(selectedMessageIndex, 1);
  selectedMessageIndex = null;
  save();
};

const bindMessageEvents = (element) => {
  const checkbox = element.querySelector('input[type="checkbox"]');
  const handle = element.querySelector('.handle');

  element.querySelector('.message').ondblclick = selectMessage;

  handle.onclick = insertInjectLine;
  if(checkbox) {
    checkbox.onchange = (e) => {
      const val = e.target.checked;
      const el = getMessage(e);
      const message = getMessageById(el.getAttribute('id'));
      const index = noteslocal[noteIndex].messages.indexOf(message);
      const content = noteslocal[noteIndex].messages[index].content;
      const result = val ? content.replace('[ ]', '[x]') : content.replace('[x] ', '[ ]');
      noteslocal[noteIndex].messages[index].content = result;
      save();
    };
  }

  handle.onmousedown = (e) => {
    dragStartX = e.pageX;
    dragStartY = e.pageY;
    document.addEventListener('mousemove', reorder);
  };
  handle.addEventListener('mouseup', (e) => {
    document.removeEventListener('mousemove', reorder);
    getMessage(e).setAttribute('style', 'transform: translate3d(0,0,0)');
  });
};

const fitEntryContent = () => {
  ENTRY.setAttribute('rows', 1);
  const rows = (((ENTRY.scrollHeight - 53)/22) + 1).toFixed(0);
  if(ENTRY.value.length > 1) {
    ENTRY.setAttribute('rows', rows);
  }
};

const autoSuggest = {
  el: $('#autoSuggest'),
  hide: () => {
    autoSuggest.el.innerHTML = '';
    autoSuggest.el.classList.remove('as-visible');
  },
  isOpen: () =>
    document.querySelector('.as-visible') || false,
  listen: (indicator) => {
    for(let i = ENTRY.selectionStart; i >= 0; i--) {
      if(ENTRY.value[i] === ' ') {
        return false;
      }
      else if(ENTRY.value[i] === indicator) {
        return true;
      }
    }
  },
  query: (params) => {
    const indicator = params.indicator.symbol;
    const inc = params.indicator.include;
    const stopper = inc ? ' ' : indicator;
    let matches = [];
    autoSuggest.currentIndicator = indicator;
    autoSuggest.indicatorIncluded = inc;

    for(let i = ENTRY.selectionStart; i >= 0; i--) {
      if(ENTRY.value[i] === stopper) {
        autoSuggest.hide();
        return;
      }
      else if(ENTRY.value[i - (inc ? 0 : 1)] === indicator) {
        let lookup = '';
        let j = i;

        while(ENTRY.value[j] !== stopper && ENTRY.value[j] !== undefined) {
          lookup += ENTRY.value[j];
          j++;
        }
        if((j - i) > params.start) {
          matches = params.set.filter(result => result.includes(lookup));

          if(matches.length > 0 && !autoSuggest.isOpen()) {
            const results = `
              <ul>
                ${matches.map((match, index) => {
                  return `<li ${index < 1 ? 'class="as-selected"': ''}>${params.display ? params.display(match) : match}</li>`;
                }).join(' ')}
              </ul>
            `;
            autoSuggest.el.classList.add('as-visible');
            autoSuggest.el.setAttribute('style', `transform: translate3d(${ENTRY.selectionStart * 8.5 + 65}px,0,0)`);
            autoSuggest.el.innerHTML = results;
            return;
          }
        }
      }
      else {
        autoSuggest.hide();
      }
    }
  },
  fill: (indicator, replace) => {
    const inc = autoSuggest.indicatorIncluded;
    const stopper = inc ? ' ' : indicator + ' ';
    for(let i = ENTRY.selectionStart; i >= 0; i--) {
      let lookup = '';
      if(ENTRY.value[i] === stopper) {
        return;
      }
      else if(ENTRY.value[i - (inc ? 0 : 1)] === indicator) {
        let j = i;
        const vals = [...ENTRY.value];
        while(ENTRY.value[j] !== stopper && ENTRY.value[j] !== undefined) {
          lookup += ENTRY.value[j];
          j++;
        }
        vals.splice(i, lookup.length, ...replace);
        ENTRY.value = vals.join('') + stopper;
        autoSuggest.el.innerHTML = '';
        autoSuggest.el.classList.remove('as-visible');
      }
    }
  }
};

const key = (key) => {
  switch(key) {
    case 'ArrowUp':
      return 38;
    case 'ArrowDown':
      return 40;
    case 'Shift':
      return 16;
    case 'Command':
      return 91;
    case 'Backspace':
      return 8;
    case 'Enter':
      return 13;
  }
};

const keyHeld = (which) => {
  const test = key(which);
  let res = false;
  KEYS_PRESSED.forEach((pressed) => {
    if(pressed === test) {
      res = true;
    }
  });
  return res;
};

const selectWithArrowKeys = (e) => {
  const direction = e.keyCode === key('ArrowUp') ? 'up' : 'down';
  if(ENTRY === document.activeElement) {
    let toSelect;
    let toDeselect;
    const as = autoSuggest.isOpen() || false;

    if(as) {
      const items = as.querySelectorAll('li');
      const selected = as.querySelector('.as-selected');
      const increment = direction === 'up' ? -1 : 1;
      let index = [...items].indexOf(selected);
      let next;

      if(index + increment < items.length) {
        next = index + increment;
      }
      else {
        next = 0;
      }
      if(index + increment < 0) {
        next = items.length - 1;
      }

      items[index].classList.remove('as-selected');
      items[next].classList.add('as-selected');
    }

    if(direction === 'up') {
      if(keyHeld('Shift')) {
        if(selectedMessageIndex === null) {
          toSelect = CONTENT.querySelector('.message:last-child');
          toDeselect = 0;
        }
        else {
          toSelect = CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex})`);
          toDeselect = 2;
        }
        selectMessage(toSelect);
        CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex + toDeselect})`).classList.remove('message-selected');
      }
    }
    else {
      if(keyHeld('Shift')) {
        toSelect = CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex + 2})`);
        toDeselect = 0;
        selectMessage(toSelect);
        CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex + toDeselect})`).classList.remove('message-selected');
      }
    }
  }
};

const bindUIEvents = () => {

  ENTRY.onkeydown = (e) => {
    const hittingEnter = e.keyCode === key('Enter');
    if(hittingEnter) {
      e.preventDefault();
      if(selectedMessageIndex && ENTRY.value.length < 1) {
        deleteMessage();
        ENTRY.setAttribute('rows', 1);
      }
    }
    KEYS_PRESSED.push(e.keyCode);
  };

  ENTRY.onkeyup = (e) => {
    const hittingEnter = e.keyCode === key('Enter');
    const canSendMessage = ENTRY.value.length > 1;
    const as = autoSuggest.isOpen();

    KEYS_PRESSED.forEach((key, index) => {
      if(key === e.keyCode) {
        KEYS_PRESSED.splice(index, 1);
      }
    });

    if(as && e.keyCode === key('Enter')) {
      autoSuggest.fill(autoSuggest.currentIndicator, document.querySelector('.as-selected .target').innerText);
      return;
    }
    if(hittingEnter && canSendMessage) {
      enterMessage();
    }
    if(e.keyCode === key('ArrowUp') || e.keyCode === key('ArrowDown')) {
      e.preventDefault();
      selectWithArrowKeys(e);
    }
    else {
      if(autoSuggest.listen('$')) {
        autoSuggest.query({
          indicator: {
            symbol: '$',
            include: true
          },
          set: DOC_VARS.map(v => {
            return v.name;
          }),
          start: 0,
          display: (match) => {
            let val;
            DOC_VARS.forEach(v => {
              if(v.name === match) {
                val = v.val;
                return;
              }
            })
            return `<span class="target">${match}</span> ${val}`;
          }
        });
      }
      if(autoSuggest.listen(':')) {
        autoSuggest.query({
          indicator: {
            symbol: ':',
            include: false
          },
          set: EMOJIS,
          start: 1,
          display: (match) => {
            return emojis[match] + ' ' + `<span class="target">${match}</span>`;
          }
        });
      }
    }
    if(ENTRY.value.length === 0) {
      autoSuggest.hide();
    }
    fitEntryContent();
  };

  ENTRY.onblur = () => {
    if(selectedMessageIndex && document.querySelector('.message-selected')) {
      selectedMessageIndex = null;
      document.querySelector('.message-selected').classList.remove('message-selected');
      ENTRY.value = '';
      fitEntryContent();
    }
    if(injectLine) {
      document.querySelector('.inject-line').remove();
      injectLine = null;
    }
    autoSuggest.hide();
  };

  document.body.onkeyup = (e) => {
    if(e.key === 'Backspace') {
      let selected = document.querySelectorAll('.message--selected');
      selected.forEach(select => {
        select.remove();
      });
    }
  };

  $('#themeLight').onclick = setLightTheme;
  $('#themeDark').onclick = setDarkTheme;
};

const init = () => {
  localforage.getItem('theme').then(theme => {
    if(!theme) {
      setDarkTheme();
    }
    else {
      if(theme !== 'dark-theme') {
        setLightTheme();
      }
      else {
        setDarkTheme();
      }
    }
  });
  loadNotes();
  bindUIEvents();
};

init();
