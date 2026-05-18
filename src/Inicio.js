import { useState, useEffect, useRef } from "react";
import "./Inicio.css";

function Inicio({ empezar }) {

    const [inicio, setInicio] = useState("");
    const [fin, setFin] = useState("");

    const [idInicio, setIdInicio] = useState("");
    const [idFin, setIdFin] = useState("");

    const [videoInicioSeleccionado, setVideoInicioSeleccionado] = useState(null);
    const [videoFinSeleccionado, setVideoFinSeleccionado] = useState(null);

    const [resultadosInicio, setResultadosInicio] = useState([]);
    const [resultadosFin, setResultadosFin] = useState([]);

    const debounceInicio = useRef(null);
    const debounceFin = useRef(null);

    const cacheRef = useRef({});

    const bloqueadoInicio = useRef(false);
    const bloqueadoFin = useRef(false);

    useEffect(() => {

        if (bloqueadoInicio.current) return;

        if (inicio.length < 3) {
            setResultadosInicio([]);
            return;
        }

        if (cacheRef.current[inicio]) {
            setResultadosInicio(cacheRef.current[inicio]);
            return;
        }

        clearTimeout(debounceInicio.current);

        debounceInicio.current = setTimeout(() => {

            fetch("/juego-youtube/api/buscar?q=" + inicio)
                .then(res => res.json())
                .then(data => {
                    const resultados = Array.isArray(data) ? data : [];
                    setResultadosInicio(resultados);
                    cacheRef.current[inicio] = resultados;
                })
                .catch(() => setResultadosInicio([]));

        }, 500);

        return () => clearTimeout(debounceInicio.current);

    }, [inicio]);

    useEffect(() => {

        if (bloqueadoFin.current) return;

        if (fin.length < 3) {
            setResultadosFin([]);
            return;
        }

        if (cacheRef.current[fin]) {
            setResultadosFin(cacheRef.current[fin]);
            return;
        }

        clearTimeout(debounceFin.current);

        debounceFin.current = setTimeout(() => {

            fetch("/juego-youtube/api/buscar?q=" + fin)
                .then(res => res.json())
                .then(data => {
                    const resultados = Array.isArray(data) ? data : [];
                    setResultadosFin(resultados);
                    cacheRef.current[fin] = resultados;
                })
                .catch(() => setResultadosFin([]));

        }, 500);

        return () => clearTimeout(debounceFin.current);

    }, [fin]);

    function handleEmpezar() {
        if (!idInicio || !idFin) return;
        empezar(idInicio, idFin);
    }

    return (
        <div className="inicio-container">

            {/* HEADER */}
            <div className="header">
                <h1 className="titulo">
                    <span className="youtube-logo">▶</span> YouTube Game
                </h1>
                <p className="subtitulo">
                    Conecta un vídeo con otro usando recomendaciones
                </p>
            </div>

            {/* INICIO */}
            <div className="buscador-section">

                <h2 className="seccion-titulo">🎬 Vídeo inicial</h2>

                <input
                    className="input-youtube"
                    placeholder="Buscar vídeo de inicio..."
                    value={inicio}
                    onChange={(e) => {
                        bloqueadoInicio.current = false;
                        setInicio(e.target.value);
                        setIdInicio("");
                        setVideoInicioSeleccionado(null);
                    }}
                />

                {videoInicioSeleccionado && (
                    <div className="preview-video">
                        <img src={videoInicioSeleccionado.thumbnail} />
                        <p>{videoInicioSeleccionado.title}</p>
                    </div>
                )}

                <div className="lista-resultados">
                    {resultadosInicio.map((v) => (
                        <div
                            key={v.videoId}
                            className="video-card"
                            onClick={() => {
                                bloqueadoInicio.current = true;

                                setInicio(v.title);
                                setIdInicio(v.videoId);
                                setVideoInicioSeleccionado(v);

                                setResultadosInicio([]);

                                setTimeout(() => {
                                    bloqueadoInicio.current = false;
                                }, 300);
                            }}
                        >
                            <img src={v.thumbnail} />
                            <p>{v.title}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* FIN */}
            <div className="buscador-section">

                <h2 className="seccion-titulo">🎯 Vídeo objetivo</h2>

                <input
                    className="input-youtube"
                    placeholder="Buscar vídeo objetivo..."
                    value={fin}
                    onChange={(e) => {
                        bloqueadoFin.current = false;
                        setFin(e.target.value);
                        setIdFin("");
                        setVideoFinSeleccionado(null);
                    }}
                />

                {videoFinSeleccionado && (
                    <div className="preview-video">
                        <img src={videoFinSeleccionado.thumbnail} />
                        <p>{videoFinSeleccionado.title}</p>
                    </div>
                )}

                <div className="lista-resultados">
                    {resultadosFin.map((v) => (
                        <div
                            key={v.videoId}
                            className="video-card"
                            onClick={() => {
                                bloqueadoFin.current = true;

                                setFin(v.title);
                                setIdFin(v.videoId);
                                setVideoFinSeleccionado(v);

                                setResultadosFin([]);

                                setTimeout(() => {
                                    bloqueadoFin.current = false;
                                }, 300);
                            }}
                        >
                            <img src={v.thumbnail} />
                            <p>{v.title}</p>
                        </div>
                    ))}
                </div>
            </div>

            <button className="btn-youtube" onClick={handleEmpezar}>
                🚀 Empezar partida
            </button>

        </div>
    );
}

export default Inicio;