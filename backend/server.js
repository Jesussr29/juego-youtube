const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());

// 🔑 API KEY
//xxxxxxxxxxxxxx
//const API_KEY = "xxxxxxxxxxxxxx";

//xxxxxxxxxxxxxx
//const API_KEY = "xxxxxxxxxxxxxx";

//xxxxxxxxxxxxxx
const API_KEY = "xxxxxxxxxxxxxx";

// 📦 DB
const FILE = "./videos.json";

// ==========================
// 📦 DB HELPERS
// ==========================
function loadVideos() {
    try {
        if (!fs.existsSync(FILE)) return [];
        return JSON.parse(fs.readFileSync(FILE, "utf8"));
    } catch {
        return [];
    }
}

function saveVideos(data) {
    try {
        fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
    } catch { }
}

// ==========================
// 🚫 SHORTS FILTER
// ==========================
function esShort(title = "") {
    const t = title.toLowerCase();
    return (
        t.includes("shorts") ||
        t.includes("#shorts") ||
        t.includes("short video") ||
        t.includes("youtube shorts")
    );
}

// ==========================
// 💾 GUARDAR SIN DUPLICADOS
// ==========================
function guardarEnDB(nuevos) {
    let db = loadVideos();
    const existentes = new Set(db.map(v => v.videoId));

    const filtrados = nuevos.filter(v => !existentes.has(v.videoId));

    if (filtrados.length > 0) {
        db = [...db, ...filtrados];
        saveVideos(db);
    }
}

// ==========================
// 🔍 BUSCAR EN DB
// ==========================
function buscarVideos(videos, query) {
    const palabras = query.toLowerCase().split(" ");

    return videos.filter(v => {
        const titulo = (v.title || "").toLowerCase();
        const canal = (v.channel || "").toLowerCase();

        return palabras.every(p =>
            titulo.includes(p) || canal.includes(p)
        );
    });
}

// ==========================
// 🌐 YOUTUBE FETCH
// ==========================
async function fetchYouTube(query, max = 10) {
    const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${max}&videoEmbeddable=true&safeSearch=moderate&key=${API_KEY}`
    );

    const data = await res.json();
    if (!data.items) return [];

    const videos = data.items
        .filter(v => v.id?.videoId)
        .filter(v => !esShort(v.snippet?.title || ""))
        .map(v => ({
            videoId: v.id.videoId,
            title: v.snippet.title,
            thumbnail: v.snippet.thumbnails?.medium?.url,
            channel: v.snippet.channelTitle
        }));

    guardarEnDB(videos);

    return videos;
}

// ==========================
// 🎯 INFO DE UN VIDEO
// ==========================
app.get("/video/:videoId", async (req, res) => {
    try {

        const videoId = req.params.videoId;

        const db = loadVideos();

        const video = db.find(v => v.videoId === videoId);

        if (video) {
            return res.json(video);
        }

        // si no está en DB → pedir a YouTube API
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${API_KEY}`
        );

        const data = await response.json();

        const item = data.items?.[0];

        if (!item) {
            return res.json({
                videoId,
                title: "Video no encontrado",
                thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
            });
        }

        const videoInfo = {
            videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails?.medium?.url,
            channel: item.snippet.channelTitle
        };

        res.json(videoInfo);

    } catch (err) {
        console.error("VIDEO ERROR:", err);
        res.status(500).json({
            videoId: req.params.videoId,
            title: "Error cargando video",
            thumbnail: `https://i.ytimg.com/vi/${req.params.videoId}/mqdefault.jpg`
        });
    }
});

// ==========================
// 🔵 BUSCAR (PRIORIDAD REAL A DB)
// ==========================
app.get("/buscar", async (req, res) => {
    try {
        const query = (req.query.q || "").trim().toLowerCase();
        if (query.length < 2) return res.json([]);

        const db = loadVideos();

        const palabras = query.split(" ").filter(p => p.length > 1);

        // =========================
        // 🔥 DB + API (MISMO NIVEL)
        // =========================
        const resultadosDB = db.map(v => ({ ...v }));
        const resultadosAPI = await fetchYouTube(query, 10);

        let resultados = [...resultadosDB, ...resultadosAPI];

        // =========================
        // 🚨 ELIMINAR DUPLICADOS (CLAVE)
        // =========================
        const unicos = new Map();

        for (const v of resultados) {
            if (!v.videoId) continue;
            if (!unicos.has(v.videoId)) {
                unicos.set(v.videoId, v);
            }
        }

        resultados = Array.from(unicos.values());

        // =========================
        // 🔥 FUNCIÓN DE SIMILITUD REAL
        // =========================
        const calcularScore = (texto) => {
            texto = (texto || "").toLowerCase();

            let score = 0;

            if (texto === query) score += 1000;
            if (texto.includes(query)) score += 500;

            let lastIndex = 0;
            palabras.forEach(p => {
                const index = texto.indexOf(p, lastIndex);
                if (index !== -1) {
                    score += 80;
                    lastIndex = index;
                }
            });

            palabras.forEach(p => {
                if (texto.includes(p)) score += 20;
            });

            if (texto.length > query.length * 3) {
                score *= 0.9;
            }

            return score;
        };

        // =========================
        // 🔥 SCORING FINAL
        // =========================
        resultados = resultados
            .map(v => {
                const titulo = v.title || "";
                const canal = v.channel || "";

                let score =
                    calcularScore(titulo) +
                    calcularScore(canal) * 0.3;

                return { ...v, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10)
            .map(({ score, ...v }) => v);

        res.json(resultados);

    } catch (err) {
        console.error("BUSCAR ERROR:", err);
        res.status(500).json([]);
    }
});

// ==========================
// 🔴 RECOMENDADOS (MEJORADO + ANTI BURBUJA)
// ==========================
app.get("/recomendados/:videoId", async (req, res) => {
    try {
        const videoId = req.params.videoId;
        const db = loadVideos();

        const videoBase = db.find(v => v.videoId === videoId);
        if (!videoBase) return res.json([]);

        const norm = s => (s || "")
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const tituloBase = norm(videoBase.title);
        const canalBase = norm(videoBase.channel);

        const palabras = tituloBase.split(" ").filter(p => p.length > 3);

        const MAX = 10;

        // =========================
        // 🔵 SCORE BASE (DB)
        // =========================
        let candidatos = db
            .filter(v => v.videoId !== videoId)
            .map(v => {
                const titulo = norm(v.title);
                const canal = norm(v.channel);

                let scoreTitulo = 0;
                let scoreCanal = 0;
                let scoreRandom = Math.random() * 2;

                // 🔥 título
                palabras.forEach(p => {
                    if (titulo.includes(p)) scoreTitulo += 2;
                });

                // 🔥 canal
                palabras.forEach(p => {
                    if (canal.includes(p)) scoreCanal += 1;
                });

                if (canal === canalBase) scoreCanal += 5;

                // ❌ PENALIZACIÓN: títulos casi iguales (evita clones)
                if (titulo === tituloBase) scoreTitulo -= 5;

                return {
                    ...v,
                    scoreTitulo,
                    scoreCanal,
                    score: scoreTitulo + scoreCanal + scoreRandom
                };
            });

        // =========================
        // 🔥 ORDENAR
        // =========================
        candidatos.sort((a, b) => b.score - a.score);

        // =========================
        // 🔥 CONTROL DE DUPLICADOS REAL
        // =========================
        const usados = new Set();
        const usadosCanales = new Map();

        function addUnique(list, limit) {
            const out = [];

            for (const v of list) {
                if (out.length >= limit) break;

                // ❌ evitar duplicados
                if (usados.has(v.videoId)) continue;

                const canal = norm(v.channel);
                const count = usadosCanales.get(canal) || 0;

                // ❌ limitar canal repetido
                if (count >= 2) continue;

                usados.add(v.videoId);
                usadosCanales.set(canal, count + 1);

                out.push(v);
            }

            return out;
        }

        // =========================
        // 🔥 DIVISIÓN ESTILO YOUTUBE
        // =========================

        const porTitulo = addUnique(
            candidatos.filter(v => v.scoreTitulo > v.scoreCanal),
            4
        );

        const porCanal = addUnique(
            candidatos.filter(v => v.scoreCanal >= v.scoreTitulo),
            3
        );

        const exploracion = addUnique(
            candidatos.filter(v => !usados.has(v.videoId))
                .sort(() => Math.random() - 0.5),
            3
        );

        // =========================
        // 🔥 RESULTADO FINAL
        // =========================
        let resultado = [...porTitulo, ...porCanal, ...exploracion];

        // relleno si falta
        if (resultado.length < MAX) {
            const extra = addUnique(
                candidatos.filter(v => !usados.has(v.videoId)),
                MAX - resultado.length
            );

            resultado = [...resultado, ...extra];
        }

        res.json(resultado.slice(0, MAX).map(({ score, scoreTitulo, scoreCanal, ...v }) => v));

    } catch (err) {
        console.error("💥 ERROR /recomendados:", err);
        res.status(500).json([]);
    }
});

// ==========================
app.listen(3001, () =>
    console.log("🚀 SERVER CON PRIORIDAD DB ACTIVO")
);
