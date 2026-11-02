/* Lampa source and voice chooser v9. Install UAKino separately. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MamaAutoRank = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function normalize(value) {
    return String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[._\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }
  var language = /(?:^|[^a-zа-яіїєґ])(ukrainian|ukrain|ukr|ua|uk|укр|рус|рос|україн[а-яіїєґ]*|украин[а-яіїєґ]*|russian|rus|ru|русск[а-я]*|росій[а-яіїєґ]*)(?=$|[^a-zа-яіїєґ])/g;
  function langOf(token) { return /^(uk|ua|укр)/.test(token) ? 'uk' : 'ru'; }
  function dubbed(text) {
    return /(?:^|[^a-zа-яіїєґ])(?:dub(?:bed)?|db|дб|д|дубляж[а-я]*|дубл[еьиіьоа-яіїєґ]*|d)(?=$|[^a-zа-яіїєґ])/.test(normalize(text));
  }
  var studios = [
    ['TVShows', /(?:^|[^a-zа-я])(?:tv\s*shows|тв\s*шоу[сз]?)(?=$|[^a-zа-я])/],
    ['Red Head Sound', /(?:^|[^a-z])(?:red\s*head\s*sound|rhs)(?=$|[^a-z])/],
    ['HDRezka', /(?:^|[^a-zа-я])(?:hd\s*rezka(?:\s*studio)?|hd\s*резка|резка)(?=$|[^a-zа-я])/],
    ['Кубик в Кубе', /(?:^|[^a-zа-яії])(?:kubik(?:\s*v\s*kube)?|кубик(?:\s*в\s*кубе)?|кубік)(?=$|[^a-zа-яії])/],
    ['LostFilm', /(?:^|[^a-z])lost\s*film(?:\s*tv)?(?=$|[^a-z])/]
  ];
  function voiceInfo(value) {
    var tracks = Array.isArray(value) ? value : [value], best = {rank: 7, label: 'Інша озвучка', language: null};
    tracks.forEach(function (track) {
      var object = track && typeof track === 'object', text = normalize(object ? [track.title, track.name, track.translation, track.studio, track.type].filter(Boolean).join(' ') : track);
      if (object && /^(?:subtitles?|text|субтит)/.test(normalize(track.type || ''))) return;
      var explicit = object ? normalize(track.language || track.lang || '') : '';
      var clauses = text.split(/[|;\n+\/]/);
      if (explicit) clauses = [explicit + ' ' + text];
      clauses.forEach(function (clause) {
        var markers = [], match; language.lastIndex = 0;
        while ((match = language.exec(clause))) markers.push({lang: langOf(match[1]), start: match.index, end: language.lastIndex});
        // Associate translation words only inside a language's own span. A shared DUB tag is ambiguous.
        markers.forEach(function (marker, i) {
          var segment = markers.length === 1 ? clause : clause.slice(marker.start, i + 1 < markers.length ? markers[i + 1].start : clause.length);
          if (!/(?:subtitles?|\bsubs?\b|субтит)/.test(segment) && dubbed(segment)) {
            var rank = marker.lang === 'uk' ? 0 : 1;
            if (rank < best.rank) best = {rank: rank, label: marker.lang === 'uk' ? 'Український дубляж' : 'Російський дубляж', language: marker.lang};
          }
        });
      });
      studios.forEach(function (studio, i) { if (studio[1].test(text) && i + 2 < best.rank) best = {rank: i + 2, label: studio[0], language: explicit || null}; });
    });
    return best;
  }
  function voiceOptions(value) {
    var result = [], seen = {};
    function add(rank, label, lang) {
      var key = rank + ':' + label + ':' + lang;
      if (!seen[key]) { seen[key] = true; result.push({rank: rank, label: label, language: lang}); }
    }
    (Array.isArray(value) ? value : [value]).forEach(function (track) {
      var object = track && typeof track === 'object';
      if (object && /^(?:subtitles?|text|субтит)/.test(normalize(track.type || ''))) return;
      var text = normalize(object ? [track.title, track.name, track.translation, track.studio, track.type].filter(Boolean).join(' ') : track);
      var explicit = object ? normalize(track.language || track.lang || '') : '';
      (explicit ? [explicit + ' ' + text] : text.split(/[|;\n+\/]/)).forEach(function (clause) {
        var markers = [], match, knownDub = false;
        language.lastIndex = 0;
        while ((match = language.exec(clause))) markers.push({lang: langOf(match[1]), start: match.index});
        markers.forEach(function (marker, i) {
          var segment = markers.length === 1 ? clause : clause.slice(marker.start, i + 1 < markers.length ? markers[i + 1].start : clause.length);
          if (!/(?:subtitles?|\bsubs?\b|субтит)/.test(segment) && dubbed(segment)) {
            knownDub = true;
            add(marker.lang === 'uk' ? 0 : 1, marker.lang === 'uk' ? 'Український дубляж' : 'Російський дубляж', marker.lang);
          }
        });
        if (/(?:subtitles?|\bsubs?\b|субтит)/.test(clause)) return;
        if (!knownDub && dubbed(clause)) add(1.5, 'Дубляж · мову не вказано', null);
        studios.slice(0, 2).forEach(function (studio, i) {
          if (studio[1].test(clause)) add(i + 2, studio[0], explicit || null);
        });
      });
    });
    return result.sort(function (a, b) { return a.rank - b.rank; });
  }
  function resolution(text) {
    var value = normalize(text), match = value.match(/(?:^|\D)(2160|1080|720|576|480)[pi]?(?:$|\D)/);
    return match ? Number(match[1]) : /\b4k\b/.test(value) ? 2160 : 0;
  }
  function requiredBps(item) {
    var bitrate = Number(item.bitrateBps || 0);
    if (bitrate > 0) return bitrate;
    var bytes = Number(item.fileSizeBytes || item.size_bytes || item.size || 0), seconds = Number(item.durationSeconds || 0);
    return bytes > 0 && seconds > 0 ? bytes / seconds : 0;
  }
  function speedInfo(item) {
    var measured = item.measuredBps, required = requiredBps(item);
    if (measured == null || !isFinite(Number(measured))) return {known: false, viable: true, ratio: null};
    measured = Math.max(0, Number(measured));
    return {known: true, viable: measured > 0 && (!required || measured >= required * 1.25), ratio: required ? measured / required : null};
  }
  function legacyCodec(value) {
    var text = normalize(value);
    return /(?:^|[^a-z0-9])(?:xvid|divx|dx50|fmp4|mp4v(?: es)?|mpeg\s*4\s*asp)(?=$|[^a-z0-9])/.test(text) ||
      (/(?:^|[^a-z0-9])mpeg\s*4(?=$|[^a-z0-9])/.test(text) && !/(?:avc|h\s*264|x264)/.test(text));
  }
  function cameraQuality(title) { return /(?:^|[^a-z0-9])(?:cam(?:rip)?|hdcam|telesync[hc]?|telecine|ts(?:rip)?|tc|scr|dvdscr)(?=$|[^a-z0-9])/.test(title); }
  function inspect(item) {
    var title = normalize(item.title || item.name), voice = voiceInfo(item.audioTracks || item.voices || item.translation || title), speed = speedInfo(item);
    var bad = cameraQuality(title) && !item.allowCamera;
    var rawSeeds = item.seeders == null ? item.seeds : item.seeders;
    var seeds = Number(rawSeeds), knownSeeds = rawSeeds != null && rawSeeds !== '' && isFinite(seeds);
    var legacy = legacyCodec(title);
    var dead = knownSeeds && seeds <= 0 && Number(item.peers || 0) <= 0 && !(speed.known && speed.viable);
    var res = resolution(item.resolution || title), quality = res === 1080 ? 4 : res === 720 ? 3 : res === 2160 ? 1 : 2;
    if (/remux/.test(title)) quality -= 1;
    var codec = /(?:h\s*264|x264|avc)/.test(title) ? 1 : /(?:h\s*265|x265|hevc|av1)/.test(title) ? -1 : 0;
    return {item: item, viable: !bad && !legacy && !dead && speed.viable, reason: bad ? 'camera-quality' : legacy ? 'legacy-video-codec' : dead ? 'no-seeders' : !speed.viable ? 'too-slow' : null, voice: voice, speed: speed, quality: quality, codec: codec, seedScore: knownSeeds ? Math.log(1 + Math.max(0, seeds)) : 0};
  }
  function balance(item, minutes) {
    var res=resolution(item.resolution||item.title),seeds=Math.max(0,Number(item.seeders)||0),peers=Math.max(0,Number(item.peers)||0),bitrate=minutes>0?Number(item.size||0)*8/(minutes*60):0;
    return (res>=1080?3:res>=720?2:1)+Math.log(1+Math.min(500,seeds))*1.1+Math.log(1+peers)*.25-Math.log(1+peers/(seeds+1))*.5+(/avc|h[ ._-]?264|x264/i.test(item.title)? .5:0)-(/remux/i.test(item.title)?2:0)-(cameraQuality(normalize(item.title))?3:0)-(bitrate>12000000?Math.log(bitrate/12000000)*.8:0);
  }
  function rank(items) {
    return items.map(inspect).filter(function (x) { return x.viable; }).sort(function (a, b) {
      return a.voice.rank - b.voice.rank || b.quality - a.quality || b.codec - a.codec || ((b.speed.ratio == null ? 0 : Math.min(2, b.speed.ratio)) - (a.speed.ratio == null ? 0 : Math.min(2, a.speed.ratio))) || b.seedScore - a.seedScore;
    });
  }
  return {cameraQuality:cameraQuality,balance:balance,legacyCodec: legacyCodec, normalize: normalize, voiceInfo: voiceInfo, voiceOptions: voiceOptions, resolution: resolution, requiredBps: requiredBps, speedInfo: speedInfo, inspect: inspect, rank: rank};
}));

(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MamaCodec = api;
}(typeof window !== 'undefined' ? window : this, function () {
  'use strict';
  function inspect(input) {
    var bytes = input instanceof Uint8Array ? input.subarray(0, 65536) : new Uint8Array(0);
    var container = 'unknown', found = null;
    function text(offset, length) {
      var result = '';
      for (var i = offset; i < offset + length && i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
      return result;
    }
    function number(offset, little) {
      if (offset + 4 > bytes.length) return 0;
      return little ? bytes[offset] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536 + bytes[offset + 3] * 16777216 : bytes[offset] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3];
    }
    function accept(id) {
      var codec = /^(?:XVID|DIVX|DX50|FMP4|MP4V|M4S2|mp4v|V_MPEG4\/ISO\/ASP|V_MPEG4\/MS\/V3)$/.test(id) ? 'mpeg4-asp' : /^(?:H264|AVC1|X264|avc1|avc3|V_MPEG4\/ISO\/AVC)$/.test(id) ? 'h264' : /^(?:hvc1|hev1|V_MPEGH\/ISO\/HEVC)$/.test(id) ? 'hevc' : null;
      if (codec && (!found || codec === 'mpeg4-asp')) found = codec;
    }
    function riff(start, end, depth) {
      if (depth > 8) return;
      for (var offset = start; offset + 8 <= end;) {
        var id = text(offset, 4), size = number(offset + 4, true), body = offset + 8, next = body + size;
        if (next > end || next <= offset) break;
        if (id === 'LIST' && size >= 4 && /^(?:hdrl|strl)$/.test(text(body, 4))) riff(body + 4, next, depth + 1);
        if (id === 'strh' && size >= 8 && text(body, 4) === 'vids') accept(text(body + 4, 4).toUpperCase());
        offset = next + (size % 2);
      }
    }
    function mp4(start, end, depth) {
      if (depth > 10) return;
      for (var offset = start; offset + 8 <= end;) {
        var size = number(offset, false), id = text(offset + 4, 4), head = 8;
        if (size === 1) {
          if (offset + 16 > end || number(offset + 8, false) !== 0) break;
          size = number(offset + 12, false); head = 16;
        }
        if (size === 0) size = end - offset;
        if (size < head) break;
        var next = offset + size, available = Math.min(next, end), body = offset + head;
        if (/^(?:moov|trak|mdia|minf|stbl)$/.test(id)) mp4(body, available, depth + 1);
        if (id === 'stsd' && body + 8 <= available) {
          var count = Math.min(number(body + 4, false), 256), entry = body + 8;
          for (var i = 0; i < count && entry + 8 <= available; i++) {
            var entrySize = number(entry, false);
            // VisualSampleEntry requires the fixed 78-byte body in addition to its box header.
            if (entrySize < 86 || entry + entrySize > available) break;
            accept(text(entry + 4, 4)); entry += entrySize;
          }
        }
        if (next > end) break;
        offset = next;
      }
    }
    function vint(offset, id) {
      if (offset >= bytes.length || bytes[offset] === 0) return null;
      var marker = 128, length = 1;
      while (!(bytes[offset] & marker) && length <= 8) { marker >>= 1; length++; }
      if (length > (id ? 4 : 8) || offset + length > bytes.length) return null;
      var value = id ? bytes[offset] : bytes[offset] & (marker - 1), unknown = !id && value === marker - 1;
      for (var i = 1; i < length; i++) { value = value * 256 + bytes[offset + i]; unknown = unknown && bytes[offset + i] === 255; }
      return {value: value, length: length, unknown: unknown};
    }
    function ebml(start, end, depth, inTrack) {
      if (depth > 8) return;
      for (var offset = start; offset < end;) {
        var id = vint(offset, true); if (!id) break;
        var size = vint(offset + id.length, false); if (!size) break;
        var body = offset + id.length + size.length, next = size.unknown ? end : body + size.value;
        if (next <= offset) break;
        var available = Math.min(next, end);
        if (id.value === 0x18538067 || id.value === 0x1654AE6B || id.value === 0xAE) ebml(body, available, depth + 1, id.value === 0xAE);
        if (inTrack && id.value === 0x86 && !size.unknown && size.value <= 64 && next <= end) accept(text(body, size.value));
        if (next > end) break;
        offset = next;
      }
    }
    if (bytes.length >= 12 && text(0, 4) === 'RIFF' && text(8, 4) === 'AVI ') {
      container = 'avi'; riff(12, Math.min(bytes.length, number(4, true) + 8), 0);
    } else if (bytes.length >= 4 && number(0, false) === 0x1A45DFA3) {
      container = 'mkv'; ebml(0, bytes.length, 0, false);
    } else if (bytes.length >= 8 && /^(?:ftyp|moov|stsd)$/.test(text(4, 4))) {
      container = 'mp4'; mp4(0, bytes.length, 0);
    }
    return {codec: found || 'unknown', legacy: found === 'mpeg4-asp', identified: !!found, container: container};
  }
  return {inspect: inspect};
}));

/* Grouped, remote-friendly source and voice chooser using Lampa's modal. */
(function(){
 'use strict';
 if(window.MamaChoiceUI||!window.Lampa)return;
 var L=window.Lampa,opened=false;
 function style(){
  if(document.getElementById('mama-choice-style'))return;
  var css=document.createElement('style');css.id='mama-choice-style';
  css.textContent='.mama-choice{font-size:1.05em;line-height:1.35;padding:.15em .3em .5em}.mama-choice__intro{color:#b9bdc7;font-size:.92em;margin:0 0 1em}.mama-choice__columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:1.1em}.mama-choice__group{min-width:0;padding:1em;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.1);border-radius:.8em}.mama-choice__heading{display:flex;align-items:center;gap:.65em;font-size:1.2em;font-weight:700;margin-bottom:.35em}.mama-choice__count{font-size:.65em;color:#bcc4d2;background:rgba(255,255,255,.09);padding:.15em .55em;border-radius:1em}.mama-choice__hint{color:#aeb5c2;font-size:.8em;margin-bottom:.8em}.mama-choice__list{height:48vh;overflow-y:auto;padding:.15em .25em .25em .1em;scrollbar-width:thin}.mama-choice__row{display:flex;align-items:center;justify-content:space-between;gap:.8em;min-height:5.3em;box-sizing:border-box;padding:.9em 1em;margin-bottom:.55em;background:rgba(255,255,255,.07);border:2px solid transparent;border-radius:.65em;transition:background .15s,border-color .15s}.mama-choice__row.focus{background:#fff;color:#16181d;border-color:#fff}.mama-choice__label{font-weight:700;font-size:1.12em;overflow-wrap:break-word}.mama-choice__detail{font-size:.76em;color:#aeb5c2;margin-top:.3em}.mama-choice__row.focus .mama-choice__detail{color:#515966}.mama-choice__quality{flex-shrink:0;white-space:nowrap;font-size:.82em;font-weight:700;padding:.4em .65em;border-radius:.4em;background:rgba(255,255,255,.1);color:#e3e8ef}.mama-choice__row.focus .mama-choice__quality{background:#e5eaf1;color:#202731}.mama-choice__empty{color:#9da5b3;padding:.65em 0;font-size:.87em}';
  document.head.appendChild(css);
 }
 function close(){if(!opened)return;opened=false;L.Modal.close();L.Controller.toggle('content');}
 function open(params){
  style();if(opened)close();
  var body=$('<div class="mama-choice"></div>');
  if(params.subtitle)body.append($('<div class="mama-choice__intro"></div>').text(params.subtitle));
  var columns=$('<div class="mama-choice__columns"></div>'),rows=[],positions=[],column=0;body.append(columns);
  function focus(){var target=rows[column]&&rows[column][positions[column]];if(target)L.Controller.collectionFocus(target,body);}
  function vertical(step){if(!rows[column]||!rows[column].length)return;positions[column]=Math.max(0,Math.min(rows[column].length-1,positions[column]+step));focus();}
  function horizontal(step){var next=column+step;if(next<0||next>=rows.length||!rows[next].length)return;column=next;focus();}
  function back(){close();if(params.onBack)params.onBack();}
  (params.groups||[]).forEach(function(group,columnIndex){
   rows[columnIndex]=[];positions[columnIndex]=0;
   var section=$('<div class="mama-choice__group"></div>'),options=group.options||[];
   var heading=$('<div class="mama-choice__heading"></div>').text(group.title);
   heading.append($('<span class="mama-choice__count"></span>').text(options.length));section.append(heading);
   if(group.subtitle)section.append($('<div class="mama-choice__hint"></div>').text(group.subtitle));
   var list=$('<div class="mama-choice__list"></div>');section.append(list);
   if(!options.length)list.append($('<div class="mama-choice__empty"></div>').text('Доступних варіантів не знайдено'));
   options.forEach(function(option,rowIndex){
    var row=$('<div class="mama-choice__row selector"></div>'),text=$('<div></div>');
    text.append($('<div class="mama-choice__label"></div>').text(option.label));
    if(option.detail)text.append($('<div class="mama-choice__detail"></div>').text(option.detail));
    row.append(text);row.append($('<div class="mama-choice__quality"></div>').text(option.quality||'Якість невідома'));
    row.on('hover:focus',function(e){
     column=columnIndex;positions[columnIndex]=rowIndex;
     var panel=list[0],card=row[0];
     if(panel&&card){
      var p=panel.getBoundingClientRect(),r=card.getBoundingClientRect();
      if(r.top<p.top)panel.scrollTop-=p.top-r.top;
      else if(r.bottom>p.bottom)panel.scrollTop+=r.bottom-p.bottom;
     }
     e.stopImmediatePropagation();
    });
    row.on('hover:enter',function(){close();if(option.onSelect)option.onSelect();});list.append(row);rows[columnIndex].push(row);
   });columns.append(section);
  });
  opened=true;
  L.Modal.open({title:params.title||'Оберіть озвучку',html:body,size:'large',scroll_to_center:false,onBack:back});
  for(var i=0;i<rows.length;i++)if(rows[i].length){column=i;break;}
  L.Controller.add('mama-choice',{invisible:true,toggle:function(){L.Controller.collectionSet(body);focus();},up:function(){vertical(-1);},down:function(){vertical(1);},left:function(){horizontal(-1);},right:function(){horizontal(1);},back:back});
  L.Controller.toggle('mama-choice');
 }
 window.MamaChoiceUI={open:open,close:close};
}());

/* Scan sources, choose a voice, then verify and play its best available stream. */
(function(){
 'use strict';
 if(window.MamaAutoPlay || !window.Lampa || !window.MamaAutoRank)return;
 var L=Lampa,R=window.MamaAutoRank,base='https://uakino.ax',busy=false,run=0,loadingActive=false;
 function note(s){L.Noty.show(s);}
 function stopLoading(){if(!loadingActive)return;loadingActive=false;L.Loading.stop();}
 function request(url,text,body){return new Promise(function(ok,fail){var x=new XMLHttpRequest();x.open(body?'POST':'GET',url);x.timeout=12000;x.onload=function(){if(x.status!==200)return fail(new Error('HTTP '+x.status));try{ok(text?x.responseText:JSON.parse(x.responseText));}catch(e){fail(e);}};x.onerror=x.ontimeout=function(){fail(new Error('Мережа недоступна'));};if(body)x.setRequestHeader('Content-Type','application/json');x.send(body?JSON.stringify(body):null);});}
 function call(fn,args,timeout){return new Promise(function(ok,fail){var timer=setTimeout(function(){fail(new Error('Час очікування вичерпано'));},timeout||15000);fn.apply(null,args.concat([function(x){clearTimeout(timer);ok(x);},function(){clearTimeout(timer);fail(new Error('Джерело недоступне'));}]));});}
 function query(o){return Object.keys(o).filter(function(k){return o[k]!=null;}).map(function(k){return k+'='+encodeURIComponent(o[k]);}).join('&');}
 function isTV(m){return m.media_type==='tv'||!!(m.name||m.first_air_date);}
 function timeline(m,target){var orig=m.original_title||m.original_name||m.title||m.name;return L.Timeline.view(L.Utils.hash(target?[target.season,target.season>10?':':'',target.episode,orig].join(''):orig));}
 function cancelled(token){if(token!==run)throw new Error('Скасовано');}
 function launch(m,target,url,extra){var item=Object.assign({title:(m.title||m.name)+(target?' • С'+target.season+' С'+target.episode:''),first_title:m.title||m.name,card:m,url:url,timeline:timeline(m,target),season:target&&target.season,episode:target&&target.episode,__uakExt:1},extra||{});
  stopLoading();L.Player.play(item);L.Player.playlist([item]);if(target)L.Storage.set('mama_auto_episode_'+m.id,target);return item;
 }
 function targetEpisode(m){
  if(!isTV(m))return Promise.resolve(null);
  var t=L.Storage.get('mama_auto_episode_'+m.id,{season:1,episode:1});
  var v=timeline(m,t);if(v&&v.percent>=90)t={season:t.season,episode:t.episode+1};
  return request(L.TMDB.api('tv/'+m.id+'/season/'+t.season+'?api_key='+L.TMDB.key()+'&language=uk-UA')).then(function(d){
   var eps=d.episodes||[];if(eps.some(function(e){return e.episode_number===t.episode;}))return t;
   return request(L.TMDB.api('tv/'+m.id+'/season/'+(t.season+1)+'?api_key='+L.TMDB.key()+'&language=uk-UA')).then(function(next){if(!(next.episodes||[]).length)throw new Error('Нових серій поки немає');return {season:t.season+1,episode:next.episodes[0].episode_number};});
  });
 }
 function availableVoices(p,target){var labels=p.voices||[];if(!target)return labels;var eps=p.episodes||[];
  if(eps.length)return labels.filter(function(v){return eps.some(function(e){return e.voice===v&&Number(e.season)===target.season&&Number(e.episode)===target.episode;});});
  var c=p.current||{};return Number(c.season)===target.season&&Number(c.episode)===target.episode&&c.voice?[c.voice]:[];
 }
 function dubLabel(p,target){return availableVoices(p,target).map(function(v){return {label:v,rank:R.voiceInfo(v).rank};}).filter(function(v){return v.rank<=1;}).sort(function(a,b){return a.rank-b.rank;})[0];}
 function hlsURL(p){var u=/^https?:/i.test(p.manifest||'')?p.manifest:p.manifest_abs||base+(p.manifest||'');if(!p.manifest&&!p.manifest_abs)throw new Error('Немає потоку');return /\.m3u8($|\?)/.test(u)?u:u+'.m3u8';}
 function tier(width,height){return width>=3200||height>=1500?2160:width>=1800||height>=1000?1080:width>=1200||height>=680?720:height>0?480:0;}
 function quality(height){return height>=1500?'4K':height>=1000?'Full HD':height>=680?'HD':height>0?'SD':'Якість невідома';}
 function hlsInfo(url){return request(url,true).then(function(text){var lines=text.split(/\r?\n/),variants=[];
  lines.forEach(function(line,i){if(line.indexOf('#EXT-X-STREAM-INF:')!==0)return;var r=line.match(/RESOLUTION=(\d+)x(\d+)/),bw=line.match(/BANDWIDTH=(\d+)/),next=lines.slice(i+1).filter(function(v){return v&&v[0]!=='#';})[0];if(r&&next)variants.push({height:tier(Number(r[1]),Number(r[2])),bps:Number(bw&&bw[1]||0),url:new URL(next.trim(),url).href});});
  var has4k=variants.some(function(v){return v.height>1080;});if(has4k&&/#EXT-X-MEDIA:.*TYPE=AUDIO/.test(text))throw new Error('Немає окремого сумісного потоку Full HD');
  variants=variants.filter(function(v){return v.height<=1080;});if(!variants.length&&/#EXT-X-STREAM-INF/.test(text))throw new Error('Немає потоку HD/Full HD');
  variants.sort(function(a,b){return b.height-a.height||a.bps-b.bps;});return {height:variants.length?variants[0].height:0,url:/#EXT-X-MEDIA:.*TYPE=AUDIO/.test(text)||!variants.length?url:variants[0].url};
 });}
 function mapLimit(items,fn){var index=0,result=[];function next(){var i=index++;if(i>=items.length)return Promise.resolve();return fn(items[i],i).then(function(v){result[i]=v;}).then(next);}return Promise.all([next(),next(),next()]).then(function(){return result;});}
 function uaQuery(id,target,voice){var sid=L.Storage.get('uakino_sid','');if(!sid){sid='lp'+Math.random().toString(36).slice(2)+Date.now().toString(36);L.Storage.set('uakino_sid',sid);}return {movie:id,s:sid,hevc:0,voice:voice,season:target&&target.season,episode:target&&target.episode};}
 function uaPlay(q,token){cancelled(token);return request(base+'/hls/api/play?'+query(q)).then(function(p){cancelled(token);if(q.voice&&p.current&&p.current.voice!==q.voice)throw new Error('Озвучку не підтверджено');return p;});}
 function uaStream(q,token){return uaPlay(q,token).then(function(p){
  return hlsInfo(hlsURL(p));
 });}
 function scanUakino(m,target,token){var find=m.uakino_id?Promise.resolve({found:true,movie_id:m.uakino_id}):request(base+'/hls/api/lampa/find?'+query({tmdb:m.id,imdb:m.imdb_id,type:isTV(m)?'tv':'movie',year:(m.release_date||m.first_air_date||'').slice(0,4),title:m.title||m.name,orig:m.original_title||m.original_name}));
  return find.then(function(f){cancelled(token);if(!f.found)throw new Error('На UAKino не знайдено');var q=uaQuery(f.movie_id,target),labels;
   return uaPlay(q,token).then(function(p){labels=availableVoices(p,target).filter(function(v,i,a){return a.indexOf(v)===i;});if(!labels.length&&!target&&(p.manifest||p.manifest_abs))labels=[p.current&&p.current.voice||'Озвучка джерела'];
    return mapLimit(labels,function(label){var selected=uaQuery(f.movie_id,target,label);return uaStream(selected,token).then(function(info){cancelled(token);return {label:label,height:info.height,query:selected};}).catch(function(e){cancelled(token);return {label:label,height:0,query:selected,error:e.message};});});
   });
  });
 }

 function matchRelease(m,t){var title=R.normalize(t.Title),year=Number((m.release_date||'').slice(0,4)),release=title.match(/\b(?:19|20)\d{2}\b/);if(!isTV(m)&&year&&release&&Math.abs(Number(release[0])-year)>1)return false;
  var names=[m.original_title,m.original_name,m.title,m.name].concat(m.mama_titles||[]).filter(Boolean);
  return names.some(function(n){var name=R.normalize(n),words=name.split(/[^a-zа-яіїєґ0-9]+/).filter(function(w){return w.length>=3&&!/^(the|and|for|with|from|про)$/.test(w);});if(!words.length)words=[name];
   var hits=words.filter(function(w){return new RegExp('(^|[^a-zа-яіїєґ0-9])'+w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?=$|[^a-zа-яіїєґ0-9])').test(title);}).length;return hits>=Math.ceil(words.length/2);});
 }
 function fileChoice(m,target,files){var videos=files.filter(function(f){return /\.(mkv|mp4|avi|m4v|ts|m2ts|mov|webm)$/i.test(f.path)&&!/(^|[\/\\._ -])(sample|trailer|extras?)([\/\\._ -]|$)/i.test(f.path);});
  L.Torserver.clearFileName(videos);
  if(target)videos=videos.filter(function(f){var p=L.Torserver.parse({movie:m,files:videos,filename:f.path_human,path:f.path});return Number(p.season)===target.season&&Number(p.episode)===target.episode;});
  videos.sort(function(a,b){return b.length-a.length;});if(!videos.length)throw new Error('Потрібного відеофайла немає');
  if(!target&&videos.length>1&&videos[1].length>videos[0].length*.8)throw new Error('Неоднозначні файли фільму');return videos[0];
 }
 function scanTorrents(m,token){var card=Object.assign({},m,{title:m.title||m.name,original_title:m.original_title||m.original_name,genres:m.genres||[]});
  var aliases=L.TMDB&&L.TMDB.api&&m.id?request(L.TMDB.api((isTV(m)?'tv/':'movie/')+m.id+'/translations?api_key='+L.TMDB.key())).then(function(d){card.mama_titles=(d.translations||[]).filter(function(t){return t.iso_639_1==='ru'||t.iso_639_1==='uk';}).map(function(t){return t.data.title||t.data.name;});}).catch(function(){}):Promise.resolve();
  return aliases.then(function(){cancelled(token);return call(L.Parser.get,[{search:card.original_title,movie:card,from_search:false}],45000);}).then(function(result){cancelled(token);
   var matched=(result.Results||[]).filter(function(t){return matchRelease(card,t);});
   matched.forEach(function(t){var lead=t.Title.split('/')[0].trim();if(lead.length>3)(card.mama_titles||(card.mama_titles=[])).push(lead);});
   var input=(result.Results||[]).filter(function(t){return (t.MagnetUri||t.Link)&&matchRelease(card,t);}).map(function(t){
    var video=(t.ffprobe||[]).filter(function(f){return f.codec_type==='video';})[0],audio=(t.ffprobe||[]).filter(function(f){return f.codec_type==='audio';}).map(function(f){return {title:f.tags&&f.tags.title,language:f.tags&&f.tags.language,type:'audio'};}),voices=R.voiceOptions([t.Title].concat(audio));
    return {title:t.Title,seeders:t.Seeders,peers:t.Peers,size:t.Size,allowCamera:voices.some(function(v){return v.rank<2;}),resolution:video?tier(video.width,video.height):R.resolution(t.Title),voices:voices,link:t.MagnetUri||t.Link,raw:t};
   }),groups={},ranked=R.rank(input).filter(function(c){return R.resolution(c.item.resolution||c.item.title)<=1080;});
   var preferred=ranked.some(function(c){return c.item.voices.length&&!R.cameraQuality(R.normalize(c.item.title))&&R.resolution(c.item.resolution||c.item.title)>=720;});
   ranked.forEach(function(candidate){var voices=candidate.item.voices;
    if(!voices.length&&!preferred){var v=R.voiceInfo(candidate.item.title);voices=[v.rank<7?v:{rank:7,label:/(?:MVO|ПМ|многоголос|багатоголос)/i.test(candidate.item.title)?'Багатоголосна озвучка':/(?:DVO|двухголос|двоголос)/i.test(candidate.item.title)?'Двоголосна озвучка':'Інша озвучка',language:null}];}
    voices.forEach(function(voice){var key=voice.label,g=groups[key]||(groups[key]={label:key,rank:voice.rank,height:0,candidates:[]});if(g.candidates.some(function(c){return c.item.link===candidate.item.link;}))return;g.results=result;g.candidates.push(Object.assign({},candidate,{voice:voice}));});
   });
   return Object.keys(groups).map(function(k){var g=groups[k];g.candidates.sort(function(a,b){return R.balance(b.item,m.runtime)-R.balance(a.item,m.runtime);});g.height=R.resolution(g.candidates[0].item.resolution||g.candidates[0].item.title);return g;}).sort(function(a,b){return a.rank-b.rank;});
  });
 }
 function begin(){L.Select.closeAll();L.Controller.toggle('content');busy=true;var token=++run;loadingActive=true;L.Loading.start(function(){if(token!==run)return;stopLoading();run++;busy=false;});return token;}
 function openTorrents(m,option){
  var Base=L.Component.get('torrents');
  if(!Base)throw new Error('Розділ торентів недоступний');
  L.Component.add('mama-torrents',function(object){
   Base.call(this,object);var self=this,parse=this.parse,append=this.append,start=this.start,first=true,localFilter={};
   this.getFilterData=function(){return localFilter;};this.setFilterData=function(data){localFilter=data;};
   this.parse=function(){var original=L.Parser.get;L.Parser.get=function(params,ok,fail){if(params!==object)return original.apply(this,arguments);setTimeout(function(){ok(JSON.parse(JSON.stringify(object.mama_results)));},0);};try{return parse.apply(this,arguments);}finally{L.Parser.get=original;}};
   this.append=function(items,more){var chosen=object.mama_chosen,link=chosen.MagnetUri||chosen.Link,decorated=items.filter(function(x){return (x.MagnetUri||x.Link)===link;})[0];if(decorated)Object.assign(chosen,decorated,{mama_recommended:true});
    items=items.filter(function(x){return (x.MagnetUri||x.Link)!==link;});
    if(first){first=false;items.unshift(chosen);}return append.call(this,items,more);
   };
   this.start=function(){var value=start.apply(this,arguments),root=self.render(),item=root.find('.mama-torrent-recommended').first();if(item.length)L.Controller.collectionFocus(item[0],root.find('.torrent-list'));return value;};
  });
  stopLoading();L.Activity.push({url:'',title:'Торенти • '+option.label,component:'mama-torrents',search:m.original_title||m.original_name||m.title||m.name,movie:Object.assign({},m,{title:m.title||m.name,original_title:m.original_title||m.original_name,genres:m.genres||[]}),page:1,mama_results:option.results,mama_chosen:Object.assign({},option.candidates[0].item.raw,{mama_recommended:true})});
 }
 L.Listener.follow('torrent',function(e){if(e.type==='render'&&e.element&&e.element.mama_recommended){e.item.addClass('mama-torrent-recommended');e.item.find('.torrent-item__title').prepend($('<span></span>').text('★ Рекомендовано · '));}});
 function showChoices(m,target,ua,tor,errors){
  var targetLabel=target?' • Сезон '+target.season+', серія '+target.episode:'';
  function select(option,source){if(busy)return;if(source==='torrent'){try{openTorrents(m,option);}catch(e){note(e.message);}return;}var token=begin();
   var task=source==='ua'?uaStream(option.query,token).then(function(info){cancelled(token);return launch(m,target,info.url,{uakino:{movie:option.query.movie,voice:option.query.voice,season:target&&target.season,episode:target&&target.episode},hls_type:'hlsjs'});}):Promise.resolve();
   task.catch(function(e){if(token!==run)return;stopLoading();busy=false;note(e.message);showChoices(m,target,ua,tor,errors);}).then(function(){if(token===run){busy=false;stopLoading();}});
  }
  window.MamaChoiceUI.open({title:'Оберіть озвучку',subtitle:(m.title||m.name)+targetLabel+' · Full HD / HD',groups:[
   {title:'UAKino',subtitle:errors.ua||'Усі озвучки джерела'+(target?' для цієї серії':''),options:ua.map(function(o){return {label:o.label,quality:quality(o.height),detail:o.error?'Якість не вдалося перевірити · можна повторити':'Онлайн · без торентів',onSelect:function(){select(o,'ua');}};})},
   {title:'Торенти',subtitle:errors.tor||'Дубляжі та найкращі доступні озвучки',options:tor.map(function(o){var best=o.candidates[0].item,seeds=Number(best.seeders)||0,peers=Number(best.peers)||0;return {label:o.label,quality:quality(o.height),detail:(R.cameraQuality(R.normalize(best.title))?'Екранна копія · ':'')+o.candidates.length+' роздач · '+seeds+' сідів · '+peers+' пірів · відкрити список',onSelect:function(){select(o,'torrent');}};})}
  ]});
 }
 function start(m){if(busy)return;var token=begin(),errors={};note('Сканую UAKino та торенти…');
  targetEpisode(m).then(function(target){cancelled(token);return Promise.all([
   scanUakino(m,target,token).catch(function(e){cancelled(token);errors.ua=e.message;return [];}),
   scanTorrents(m,token).catch(function(e){cancelled(token);errors.tor=e.message;return [];})
  ]).then(function(results){cancelled(token);stopLoading();busy=false;showChoices(m,target,results[0],results[1],errors);});
  }).catch(function(e){if(token===run)note(e.message);}).then(function(){if(token===run){busy=false;stopLoading();}});
 }

 function attach(e){if(e.type!=='complite'||!e.data||!e.data.movie)return;var root=e.object.activity.render(),movie=e.data.movie;
  setTimeout(function(){
   if(root.find('.view--mama-auto').length)return;
   var container=root.find('.buttons--container').first();if(!container.length)return;
   var button=$('<div class="full-start__button selector view--mama-auto" data-subtitle="Озвучки та якість"><span>Автоматичний вибір</span></div>');
   button.on('hover:enter',function(){start(movie);});container.prepend(button);
  },200);
 }
 L.Listener.follow('full',attach);
 window.MamaAutoPlay={version:9,start:start,quality:quality,tier:tier,scanTorrents:scanTorrents,voice:dubLabel,fileChoice:fileChoice,matchRelease:matchRelease};
}());
