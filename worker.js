export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);

    // ── GET /meta/index — lightweight song list (1 KV read) ──
    if (request.method === 'GET' && url.pathname === '/meta/index') {
      try {
        const index = await env.CHORDS_KV.get('meta:_index', { type: 'json' });
        return new Response(JSON.stringify(index || []), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── POST /meta/reindex — rebuild index from all songs (run once) ──
    if (request.method === 'POST' && url.pathname === '/meta/reindex') {
      try {
        const list = await env.CHORDS_KV.list({ prefix: 'meta:' });
        const all = await Promise.all(
          list.keys
            .filter(k => k.name !== 'meta:_index')
            .map(k => env.CHORDS_KV.get(k.name, { type: 'json' }))
        );
        const index = all
          .filter(s => s && s.id)
          .map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            albums: s.albums,
            music_by: s.music_by,
            lyrics_by: s.lyrics_by,
            ...(s.has_chords ? { has_chords: true } : {})
          }));
        await env.CHORDS_KV.put('meta:_index', JSON.stringify(index));
        return new Response(JSON.stringify({ ok: true, count: index.length }), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── GET /meta — return all full song metadata ──────────
    if (request.method === 'GET' && url.pathname === '/meta') {
      try {
        const list = await env.CHORDS_KV.list({ prefix: 'meta:' });
        const songs = await Promise.all(
          list.keys
            .filter(k => k.name !== 'meta:_index')
            .map(k => env.CHORDS_KV.get(k.name, { type: 'json' }))
        );
        return new Response(JSON.stringify(songs), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── GET /meta/:id — return single song metadata ────────
    if (request.method === 'GET' && url.pathname.startsWith('/meta/')) {
      try {
        const id = url.pathname.slice(6);
        const song = await env.CHORDS_KV.get('meta:' + id, { type: 'json' });
        if (!song) return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' }
        });
        return new Response(JSON.stringify(song), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── PUT /meta/:id — save/update song metadata + update index ──
    if (request.method === 'PUT' && url.pathname.startsWith('/meta/')) {
      try {
        const id = url.pathname.slice(6);
        const data = await request.json();
        if (!data.id) data.id = id;
        await env.CHORDS_KV.put('meta:' + id, JSON.stringify(data));

        // Keep lightweight index in sync
        const index = await env.CHORDS_KV.get('meta:_index', { type: 'json' }) || [];
        const lightweight = {
          id: data.id,
          title: data.title,
          artist: data.artist,
          albums: data.albums,
          music_by: data.music_by,
          lyrics_by: data.lyrics_by,
          ...(data.has_chords ? { has_chords: true } : {})
        };
        const i = index.findIndex(s => s.id === data.id);
        if (i >= 0) {
          index[i] = lightweight;
        } else {
          index.push(lightweight);
        }
        await env.CHORDS_KV.put('meta:_index', JSON.stringify(index));

        return new Response(JSON.stringify({ ok: true, id: id }), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── GET /song/:id — return a single chord entry ────────
    if (request.method === 'GET' && url.pathname.startsWith('/song/')) {
      try {
        const id = url.pathname.slice(6); // strips "/song/"
        const entry = await env.CHORDS_KV.get('song:' + id, { type: 'json' });
        if (!entry) return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404, headers: { ...cors, 'Content-Type': 'application/json' }
        });
        return new Response(JSON.stringify(entry), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── GET /songs — return all KV chord entries ───────────
    if (request.method === 'GET' && url.pathname === '/songs') {
      try {
        const list = await env.CHORDS_KV.list({ prefix: 'song:' });
        const entries = {};
        await Promise.all(list.keys.map(async k => {
          const id = k.name.slice(5);
          entries[id] = await env.CHORDS_KV.get(k.name, { type: 'json' });
        }));
        return new Response(JSON.stringify(entries), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── PUT /song — save a chord entry to KV ──────────────
    if (request.method === 'PUT' && url.pathname === '/song') {
      try {
        const data = await request.json();
        if (!data.id) throw new Error('Missing song id');
        await env.CHORDS_KV.put('song:' + data.id, JSON.stringify(data));

        // Mark song as having chords in meta + index
        const meta = await env.CHORDS_KV.get('meta:' + data.id, { type: 'json' });
        if (meta && !meta.has_chords) {
          meta.has_chords = true;
          await env.CHORDS_KV.put('meta:' + data.id, JSON.stringify(meta));
          const index = await env.CHORDS_KV.get('meta:_index', { type: 'json' }) || [];
          const i = index.findIndex(s => s.id === data.id);
          if (i >= 0) index[i].has_chords = true;
          await env.CHORDS_KV.put('meta:_index', JSON.stringify(index));
        }

        return new Response(JSON.stringify({ ok: true, id: data.id }), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    // ── POST / — generate scale tips ──────────────────────
    if (request.method === 'POST') {
      try {
        const { songTitle, key, sections } = await request.json();
        const sectionLines = sections
          .filter(s => s.chords.length > 0)
          .map(s => 'Section "' + s.label + '" chords: ' + s.chords.join(', '))
          .join('\n');
        const prompt = [
          "I'm building a guitar chord chart app and need scale suggestions for guitarists soloing over each section of a song.",
          'Song: "' + songTitle + '", overall key: ' + key,
          sectionLines,
          "For each section, suggest 1-2 scales. For each scale provide:",
          '- "name": the scale name (e.g. "E Major Pentatonic")',
          '- "notes": notes spelled out with double spaces between them (e.g. "E  F#  G#  B  C#")',
          '- "note": 2-3 sentences explaining why this scale works over these specific chords. Call out any non-diatonic chords by name, identify the specific note that creates tension, and explain how the scale handles it.',
          "Return a JSON object where keys are section labels exactly as given and values are arrays of scale objects. Return only valid JSON, no markdown, no code fences, no extra text."
        ].join('\n');
        const geminiRes = await fetch(
          'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=' + env.GEMINI_API_KEY,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.2 }
            })
          }
        );
        if (!geminiRes.ok) {
          const errText = await geminiRes.text();
          throw new Error('Gemini API error ' + geminiRes.status + ': ' + errText);
        }
        const geminiData = await geminiRes.json();
        const text = geminiData.candidates &&
                     geminiData.candidates[0] &&
                     geminiData.candidates[0].content &&
                     geminiData.candidates[0].content.parts &&
                     geminiData.candidates[0].content.parts[0] &&
                     geminiData.candidates[0].content.parts[0].text;
        if (!text) throw new Error('Empty response from Gemini');
        let result;
        try {
          result = JSON.parse(text);
        } catch (e) {
          const match = text.match(/\{[\s\S]*\}/);
          if (!match) throw new Error('Could not parse Gemini response as JSON');
          result = JSON.parse(match[0]);
        }
        return new Response(JSON.stringify(result), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not found', { status: 404, headers: cors });
  }
};
