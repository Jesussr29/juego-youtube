import { useState, useEffect } from "react";
import "./Juego.css";

function Juego({ inicio, fin }) {

    const [videoActual, setVideoActual] = useState(null);
    const [recomendados, setRecomendados] = useState([]);
    const [saltos, setSaltos] = useState(0);
    const [ganado, setGanado] = useState(false);
    const [mostrarVictoria, setMostrarVictoria] = useState(false);

    const [videoDestinoInfo, setVideoDestinoInfo] = useState(null);

    // 🔄 reset partida
    useEffect(() => {
        setVideoActual(inicio);
        setSaltos(0);
        setGanado(false);
        setMostrarVictoria(false);
    }, [inicio]);

    // 🎯 cargar info del destino (ARREGLADO DEFINITIVO)
    useEffect(() => {

        if (!fin) return;

        fetch("/juego-youtube/api/video/" + fin)
            .then(res => res.json())
            .then(data => {

                console.log("VIDEO DESTINO:", data);

                const videoId = typeof data === "string"
                    ? data
                    : data?.videoId || fin;

                const video = {
                    title:
                        data?.title ||
                        data?.snippet?.title ||
                        data?.name ||
                        data?.titulo ||
                        "Objetivo final",

                    thumbnail:
                        data?.thumbnail ||
                        `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
                };

                setVideoDestinoInfo(video);
            })
            .catch(() => {
                setVideoDestinoInfo({
                    title: "Objetivo final",
                    thumbnail: `https://i.ytimg.com/vi/${fin}/mqdefault.jpg`
                });
            });

    }, [fin]);

    // 🔥 recomendados
    useEffect(() => {

        if (!videoActual) return;

        let activo = true;

        fetch("/juego-youtube/api/recomendados/" + videoActual)
            .then(res => res.json())
            .then(data => {

                if (!activo) return;

                const lista = Array.isArray(data) ? data : [];

                const filtrados = lista.filter(v => v.videoId !== videoActual);

                setRecomendados(filtrados);
            })
            .catch(() => setRecomendados([]));

        return () => {
            activo = false;
        };

    }, [videoActual]);

    function cambiarVideo(id) {

        if (ganado) return;

        setVideoActual(id);
        setSaltos(prev => prev + 1);
    }

    // 🎯 victoria
    useEffect(() => {

        if (!videoActual || !fin) return;
        if (ganado) return;

        if (videoActual === fin) {

            setGanado(true);

            setTimeout(() => {
                setMostrarVictoria(true);
            }, 800);
        }

    }, [videoActual, fin, ganado]);

    return (
        <div className="juego-page">

            {/* ===== TOP HUD ===== */}
            <div className="hud-bar">

                <div className="hud-destino">
                    <p className="hud-label">🎯 Tu destino</p>

                    <div className="hud-video">
                        <img
                            src={`https://i.ytimg.com/vi/${fin}/mqdefault.jpg`}
                            alt="destino"
                        />

                        <div className="hud-video-info">
                            <span className="hud-video-title">
                                {videoDestinoInfo?.title || "Objetivo final"}
                            </span>

                        </div>
                    </div>
                </div>

                <div className="hud-saltos">
                    🧠 Saltos: <b>{saltos}</b>
                </div>

            </div>

            {/* ===== CONTENIDO ===== */}
            <div className="juego-container">

                {/* VIDEO */}
                <div className="video-section">

                    <iframe
                        className="video-player"
                        src={`https://www.youtube.com/embed/${videoActual}`}
                        title="video"
                        allowFullScreen
                    />

                </div>

                {/* RECOMENDADOS */}
                <div className="sidebar">

                    <h3 className="sidebar-title">🔥 Recomendados</h3>

                    {recomendados.map((v) => (
                        <div
                            key={v.videoId}
                            className="video-card-small"
                            onClick={() => cambiarVideo(v.videoId)}
                            style={{ opacity: ganado ? 0.4 : 1 }}
                        >
                            <img src={v.thumbnail} />
                            <div>
                                <p className="title">{v.title}</p>
                            </div>
                        </div>
                    ))}

                </div>

            </div>

            {/* ===== VICTORIA OVERLAY ===== */}
            {mostrarVictoria && (
                <div className="victoria-overlay">
                    <div className="victoria-card">
                        <h1>🎉 ¡HAS GANADO!</h1>
                        <p>Has llegado al objetivo en <b>{saltos}</b> saltos</p>
                        <button onClick={() => window.location.reload()}>
                            🔁 Jugar otra vez
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}

export default Juego;