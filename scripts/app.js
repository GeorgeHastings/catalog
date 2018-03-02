const ENTRY = document.getElementById('entry');
const CONTENT = document.getElementById('detailContent');
const LISTING = document.getElementById('listing');
const URL_REGEX = /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/;

const DOC_VARS = [];

let noteslocal = [];
let noteIndex = 0;
let selectedMessageIndex = null;
let injectLine;
let dragging = false;
let dragStartX;
let dragStartY;
let shifted = false;

const scrollToBottom = () => {
  document.querySelector('.detail').scrollTop += 15000;
};

const escapeRegExp = (str) =>
  str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");

const replaceAll = (str, find, replace) =>
  str.replace(new RegExp(escapeRegExp(find), 'g'), replace);

const randomString = (length) =>
  Math.round((Math.pow(36, length + 1) - Math.random() * Math.pow(36, length))).toString(36).slice(1);

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

const createElement = (markup) =>
  document.createRange().createContextualFragment(markup);

const types = {
  list: {
    match: (content) =>
      content.substr(0, 2) === '* ',
    format: (content) =>
      content.replace('* ', '')
  },
  quote: {
    match: (content) =>
      content.substr(0, 2) === '> ',
    format: (content) =>
      content.substr(1)
  },
  header: {
    match: (content) =>
      content.includes('# '),
    format: (content) => {
      let count = 1;
      let tag;
      while(count < 5) {
        if(content[count] === '#') {
          count++;
        }
        else {
          tag = `h${count}`;
          content = content.substr(count);
          count = 5;
        }
      }
      return `<${tag}>${content}</${tag}>`;
    }
  },
  variable: {
    match: (content) =>
      content.charAt(0) === '$' && content.slice(-1) === ';',
    format: (content) => {
      content = content.split(':');
      const val = content.pop().slice(0, -1).trim();
      DOC_VARS.push({
        name: content[0],
        val: val
      });
      return `<pre class="var-pre code"><span class="var-name">${content[0]}</span>:<span class="var-val">${val}</span></pre>`;
    }
  },
  idea: {
    match: (content) =>
      content.substr(0, 2) === '? ',
    format: content => {
      content = content.slice(2);
      return `<div class="idea">✦ ${content}</div>`;
    }
  },
  checkbox: {
    match: (content) =>
      content.substr(0, 3) === '[ ]' || content.substr(0, 3) === '[x]',
    format: (content) => {
      const id = randomString(4);
      const checked = content.charAt(1) === 'x' ? 'checked' : '';
      content = content.slice(3);
      return `
        <input id="${id}" type="checkbox" ${checked}/>
        <label for="${id}">${content}</label>`;
    }
  },
  math: {
    match: (content) =>
      /^[^a-z]*$/i.test(content) && !types.sparkline.match(content),
    format: (content) => {
      return `<pre class='code'><span class="comment">${content}</span> <br>${eval(content)}</pre>`;
    }
  },
  hexcode: {
    match: (content) =>
      /^#[0-9A-F]{6}$/i.test(content),
    format: (content) => {
      return content;
    }
  },
  sparkline: {
    match: (content) =>
      content.charAt(0) === '~' && content.slice(-1) === '~',
    format: (content) => {
      content = content.slice(1, -1);
      const d = ['M 0 0'];
      const data = content.split(',');
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
  code: {
    match: (content) =>
      content.substr(0, 3) === '```' && content.substr(-3) === '```',
    format: (content) => {
      content = content.slice(3, -3);
      const lang = detectLang(content);
      const id = randomString(12);
      Rainbow.color(content, lang, function(highlightedCode) {
        const el = document.querySelector(`[data-async-id="${id}"]`);
        el.setAttribute('data-language', lang);
        el.innerHTML = highlightedCode;
      });
      return `<pre data-async-id="${id}">${content}</pre>`;
    }
  },
  url: {
    match: (content) =>
      content.match(URL_REGEX) && content.charAt(0) === '[' && content.slice(-1) === ']',
    format: (content) => {
      const id = randomString(12);
      content = content.slice(1, -1);
      getThumbnail(content, (src, url) => {
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
            content = content.includes('http') ? content : `http://${content}`;
            message.querySelector('a').setAttribute('href', content);
            message.querySelector('p').innerText = content;
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
              <p>${content}</p>
            </a>
          </div>
        </div>`;
    }
  }
};

const inlineStyles = {
  api: {
    input: ['@', '@'],
    output: ['', ''],
    process: (api, callback) => {
      fetch(`${api}`).then(function(response) {
        return response.json();
      }).then(function(resp) {
        return callback(resp);
      }).catch(error => {
        callback(false);
      });
    }
  },
  bold: {
    input: ['*', '*'],
    output: ['<b>', '</b>']
  },
  italic: {
    input: ['_', '_'],
    output: ['<i>', '</i>']
  },
  code: {
    input: ['`', '`'],
    output: ['<pre class="inline-code">', '</pre>']
  }
};

const getInlineStyle = (content, expression) => {
  const inputOpen = expression.input[0];
  const inputClose = expression.input[1];
  const outputOpen = expression.output[0];
  const outputClose = expression.output[1];
  const openPos = content.indexOf(inputOpen);
  let closePos = content.indexOf(inputClose);
  if(openPos === closePos) {
    let trimmed = content.substring(openPos + 1);
    closePos = trimmed.indexOf(inputClose) + openPos;
    if(openPos === closePos) {
      return false;
    }
  }
  if(openPos > -1 && closePos > -1 && openPos < closePos) {
    return {
      open: openPos,
      close: closePos,
      inputOpen: inputOpen,
      inputClose: inputOpen,
      outputOpen: outputOpen,
      outputClose: outputClose,
      process: expression.process || false
    };
  }
  else {
    return false;
  }
};

const wrap = (content, params) => {
  let result = content.slice(params.open + 1, params.close + 1);
  if(params.process) {
    let resP = new Promise(resolve => {
      params.process(result, (res) => {
        const path = content.substr(params.close + 3).split("/")[0];
        let find = `${params.inputOpen}${result}${params.inputClose}`;
        if(path !== '') {
          const pathNav = path.split(".");
          pathNav.map(p => {
            res = res[p];
            return res;
          });
          content = content.replace(`.${path}/`, '');
        }
        const replace = `${params.outputOpen}${res}${params.outputClose}`;
        content = content.replace(find, replace);
        resolve(content);
      });
    });
    return resP;
  }
  else {
    content = content.replace(`${params.inputOpen}${result}${params.inputClose}`, `${params.outputOpen}${result}${params.outputClose}`);
    return content;
  }
  return false;
};

const getType = (content) => {
  for(let type in types) {
    if(types[type].match(content)) {
      return type;
    }
  }
  return false;
};

const fillInVars = (content) => {
  DOC_VARS.forEach(vbl => {
    content = content.replace(vbl.name, vbl.val);
  });
  return content;
};

/* jshint ignore:start */
const message = async (content) => {
  let failsafe = 0;
  const isVar = types.variable.match(content);
  content = DOC_VARS.length > 0 && !isVar ? fillInVars(content) : content;
  let type = getType(content);
  if(type !== 'math') {
    for(let style in inlineStyles) {
      let inlineStyle = getInlineStyle(content, inlineStyles[style]);
      while(inlineStyle && failsafe < 100) {
        content = await wrap(content, inlineStyle);
        inlineStyle = getInlineStyle(content, inlineStyles[style]);
        failsafe++;
      }
    }
  }
  if(type) {
    const result = await types[type].format(content);
    return type === 'url' ? result : `<div class="message ${type}"><div class="handle">▶</div><div class="m-c">${result}</div></div>`;
  }
  return `<div class="message text"><div class="handle">▶</div><div class="m-c">${content}</div></div>`;
};

const enterMessage = async () => {
  const content = ENTRY.value;
  const id = selectedMessageIndex ? noteslocal[noteIndex].messages[selectedMessageIndex].id : randomString(12);
  const type = getType(content) || 'none';
  const result = await message(content);
  recordEntry(content, type, id);
  renderMessage(result, type, id);
  scrollToBottom();
};

const recordEntry = (content, type, id) => {
  const editing = selectedMessageIndex >= 0 && document.querySelector('.message-selected');

  localforage.getItem('notes').then(function(notes) {
    if(!notes) {
      const note = {
        exerpt: CONTENT.querySelector('.message:first-child .m-c *:first-child').innerText,
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
          const injectIndex = [...document.querySelectorAll('.message')].indexOf(document.getElementById(injectLine));
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
    exerpt: CONTENT.querySelector('.message:first-child .m-c *:first-child').innerText,
    messages: noteslocal[noteIndex].messages
  };
  noteslocal[noteIndex] = note;
  localforage.setItem('notes', noteslocal);
};

const newNote = () => {
  let note = {
    exerpt: 'New Note',
    messages: []
  };
  noteslocal.unshift(note);
  renderNotes(noteslocal);
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
  // el.classList.add('insert-above');
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
    // if(type === 'variable') {
    //   showNoteDetail(noteIndex);
    // }
    // else {
      CONTENT.insertBefore(element, sibling);
    // }
  }
  else if(injectLine) {
    let before = document.getElementById(injectLine);
    document.querySelector('.inject-line').remove();
    CONTENT.insertBefore(element, before);
  }
  else {
    CONTENT.appendChild(element);
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

const showNoteDetail = (index) => {
  noteIndex = index;
  DOC_VARS.length = 0;
  renderMessages(index);
  styleSelectedNote(index);
};

const deleteNote = (index) => {
  noteslocal.splice(index, 1);
  localforage.setItem('notes', noteslocal);
  renderNotes(noteslocal);
};

const renderNotes = (notes) => {
  LISTING.innerHTML = '';
  notes.forEach((note, index) => {
    const listing = `<li onclick="showNoteDetail(${index})"><span>${note.exerpt.replace('▶', '')}</span><div class="delete" onclick="deleteNote(${index})">✕</div></li>`;
    LISTING.innerHTML += listing;
  });
  showNoteDetail(0);
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
      renderNotes(noteslocal);
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

  // element.querySelector('.edit-message').onclick = selectMessage;
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

const bindUIEvents = () => {

  ENTRY.onkeydown = (e) => {
    const hittingEnter = e.keyCode === 13;
    if(hittingEnter) {
      e.preventDefault();
      if(selectedMessageIndex && ENTRY.value.length < 1) {
        deleteMessage();
        ENTRY.setAttribute('rows', 1);
      }
    }
  };

  ENTRY.onkeyup = (e) => {
    const hittingEnter = e.keyCode === 13;
    const canSendMessage = ENTRY.value.length > 1;

    if(hittingEnter && canSendMessage) {
      enterMessage();
      ENTRY.value = '';
      // ENTRY.setAttribute('rows', 1);
    }
    if(ENTRY.value.charAt(ENTRY.value.length - 1) === '$') {
      const varResults = DOC_VARS.map(vbl => {
        return vbl.name;
      });
    }
    if(ENTRY === document.activeElement && shifted) {
      let toSelect;
      let toDeselect;
      if(e.key === 'ArrowUp') {
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
      if(e.key === 'ArrowDown') {
        toSelect = CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex + 2})`);
        toDeselect = 0;
        selectMessage(toSelect);
        CONTENT.querySelector(`.message:nth-child(${selectedMessageIndex + toDeselect})`).classList.remove('message-selected');
      }
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
  };

  document.onkeydown = (e) => {
    if(e.keyCode === 16){
      shifted = true;
    }
  };

  document.onkeyup = (e) => {
    if(e.keyCode === 16){
      shifted = false;
    }
  };

  document.body.onkeyup = (e) => {
    if(e.key === 'Backspace') {
      let selected = document.querySelectorAll('.message--selected');
      selected.forEach(select => {
        select.remove();
      });
    }
  };

  document.getElementById('themeLight').onclick = () => {
    document.body.classList = 'light-theme';
  };

  document.getElementById('themeDark').onclick = () => {
    document.body.classList = 'dark-theme';
  };
};

loadNotes();
bindUIEvents();
