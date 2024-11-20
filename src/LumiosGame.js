import React, { useState, useEffect } from 'react';
import useWebSocket from 'react-use-websocket'; // WebSocket client

const LumiosGame = () => {
  const [lumies, setLumies] = useState([
    { id: 1, color: 'red', x: 100, y: 300, changed: false },
    { id: 2, color: 'red', x: 200, y: 300, changed: false },
    { id: 3, color: 'red', x: 300, y: 300, changed: false },
    { id: 4, color: 'red', x: 400, y: 300, changed: false },
    { id: 5, color: 'red', x: 500, y: 300, changed: false },
  ]);

  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 = Joueur du bas, 1 = Joueur du haut
  const [direction, setDirection] = useState(270); // Initiale 270° pour joueur du bas
  const [power, setPower] = useState(50); // Puissance entre 10 et 200
  const [luminator, setLuminator] = useState({ x: 300, y: currentPlayer === 0 ? 580 : 20, moving: false });
  const [winner, setWinner] = useState(null);

  // Configuration WebSocket
  const { sendMessage, lastMessage } = useWebSocket('ws://localhost:3001');

  // Synchronisation avec les messages WebSocket
  useEffect(() => {
    if (lastMessage !== null) {
      console.log('Message reçu du serveur WebSocket :', lastMessage.data);

      try {
        const data = JSON.parse(lastMessage.data);

        if (data.lumies && Array.isArray(data.lumies)) {
          setLumies(data.lumies);
        }

        if (typeof data.currentPlayer === 'number') {
          setCurrentPlayer(data.currentPlayer);
        }

        if (data.winner !== undefined) {
          setWinner(data.winner);
        }
      } catch (error) {
        console.error('Erreur lors de la conversion JSON :', error);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    setDirection(currentPlayer === 0 ? 270 : 90); // 270° pour joueur bas, 90° pour joueur haut
    setLuminator({ x: 300, y: currentPlayer === 0 ? 580 : 20, moving: false });
  }, [currentPlayer]);

  const handleThrow = () => {
    setLuminator((prev) => ({ ...prev, moving: true }));

    let velocityX = Math.cos((direction * Math.PI) / 180) * power * 0.2;
    let velocityY = Math.sin((direction * Math.PI) / 180) * power * 0.2;

    const interval = setInterval(() => {
      setLuminator((prev) => {
        let newX = prev.x + velocityX;
        let newY = prev.y + velocityY;

        if (newX < 0 || newX > 600 || newY < 0 || newY > 600) {
          clearInterval(interval);
          endTurn();
        }

        checkCollision(newX, newY);
        return { ...prev, x: newX, y: newY };
      });
    }, 50);
  };

  const endTurn = () => {
    setLuminator((prev) => ({ ...prev, moving: false }));
    const nextPlayer = (currentPlayer + 1) % 2;

    const gameState = {
      lumies,
      currentPlayer: nextPlayer,
      winner,
    };

    console.log('Envoi des données au serveur WebSocket :', gameState);
    sendMessage(JSON.stringify(gameState));
    setCurrentPlayer(nextPlayer);
  };

  const checkCollision = (x, y) => {
    setLumies((prevLumies) => {
      let updatedLumies = prevLumies.map((lumie) => {
        const dist = Math.sqrt((lumie.x - x) ** 2 + (lumie.y - y) ** 2);
        if (dist < 30 && !lumie.changed) {
          const newColor = getNextColor(lumie.color);
          const impactAngle = Math.atan2(lumie.y - y, lumie.x - x);
          const pushDistance = power * 0.3;
          const pushX = Math.cos(impactAngle) * pushDistance;
          const pushY = Math.sin(impactAngle) * pushDistance;

          return {
            ...lumie,
            color: newColor,
            x: Math.min(600, Math.max(0, lumie.x + pushX)),
            y: Math.min(600, Math.max(0, lumie.y + pushY)),
            changed: true,
          };
        }
        return lumie;
      });

      if (checkWinCondition(updatedLumies)) {
        setWinner(updatedLumies[0].color === 'blue' ? 'Équipe Bleue' : 'Équipe Verte');
      }

      return updatedLumies;
    });
  };

  const getNextColor = (currentColor) => {
    return currentColor === 'red' ? 'blue' : currentColor === 'blue' ? 'green' : 'blue';
  };

  const checkWinCondition = (updatedLumies) => {
    const allBlue = updatedLumies.every((lumie) => lumie.color === 'blue');
    const allGreen = updatedLumies.every((lumie) => lumie.color === 'green');
    return allBlue || allGreen;
  };

  const handlePowerChange = (event) => {
    setPower(event.target.value);
  };

  const handleDirectionChange = (event) => {
    const sliderValue = event.target.value;
    setDirection(currentPlayer === 0 ? 270 - sliderValue : 90 + parseInt(sliderValue, 10));
  };

  return (
    <div style={{ textAlign: 'center' }}>
      <h2>Lumios Game</h2>

      {winner ? (
        <h1 style={{ color: winner === 'Équipe Bleue' ? 'blue' : 'green', fontSize: '48px' }}>
          LumioOoois! 🎉 {winner} a gagné!
        </h1>
      ) : (
        <>
          <div
            style={{
              position: 'relative',
              width: '600px',
              height: '600px',
              border: '2px solid black',
              margin: '0 auto',
            }}
          >
            {lumies.map((lumie) => (
              <div
                key={lumie.id}
                style={{
                  position: 'absolute',
                  backgroundColor: lumie.color,
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  left: `${lumie.x}px`,
                  top: `${lumie.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              ></div>
            ))}

            <div
              style={{
                position: 'absolute',
                backgroundColor: 'orange',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                left: `${luminator.x}px`,
                top: `${luminator.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              {!luminator.moving && (
                <div
                  style={{
                    position: 'absolute',
                    width: '60px',
                    height: '4px',
                    backgroundColor: 'black',
                    transform: `rotate(${direction}deg)`,
                    transformOrigin: 'center left',
                    left: '20px',
                    top: '18px',
                  }}
                ></div>
              )}
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <p>Direction : {Math.round(direction)}°</p>
            <input
              type="range"
              min="-180"
              max="180"
              value={currentPlayer === 0 ? 270 - direction : direction - 90}
              onChange={handleDirectionChange}
              style={{ width: '300px' }}
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <p>Puissance : {power}</p>
            <input type="range" min="10" max="200" value={power} onChange={handlePowerChange} />
          </div>

          <button
            onClick={handleThrow}
            disabled={luminator.moving || winner}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              fontSize: '16px',
              backgroundColor: 'orange',
              border: 'none',
              borderRadius: '10px',
            }}
          >
            Lancer
          </button>
        </>
      )}
    </div>
  );
};

export default LumiosGame;
