import { useState } from "react";
import Inicio from "./Inicio";
import Juego from "./Juego";

function App() {

    const [inicio, setInicio] = useState(null);
    const [fin, setFin] = useState(null);

    function empezar(i, f) {
        setInicio(i);
        setFin(f);
    }

    function reiniciar() {
        setInicio(null);
        setFin(null);
    }

    return (
        <div>

            {!inicio ? (
                <Inicio empezar={empezar} />
            ) : (
                <Juego
                    inicio={inicio}
                    fin={fin}
                    reiniciar={reiniciar}
                />
            )}

        </div>
    );
}

export default App;