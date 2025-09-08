import React, { useState, useEffect } from 'react';
import { QrCode, Users, Clock, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { storage } from '../utils/storage';
import { parseQRData, validateQRData } from '../utils/qr';
import { Trip, Passenger, Conductor } from '../types';
import QRScanner from '../components/QRScanner/QRScanner';
import { applySEO } from '../utils/seo';

const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualCedula, setManualCedula] = useState('');
  const [activeTrips, setActiveTrips] = useState<Trip[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [conductors, setConductors] = useState<Conductor[]>([]);
  const [scanResult, setScanResult] = useState<{
    type: 'success' | 'error';
    message: string;
    passenger?: Passenger;
  } | null>(null);

  useEffect(() => {
    applySEO({
      title: 'Escanear QR | Sistema de Reportes JF',
      description: 'Escanee códigos QR o registre por cédula para iniciar/finalizar viajes.',
      keywords: 'escanear QR, viajes, cédula, transporte',
      canonicalPath: '/scan-qr',
    });
    loadData();
  }, []);

  const loadData = () => {
    const trips = storage.getTrips();
    const passengersData = storage.getPassengers();
    const conductorsData = storage.getConductors();
    
    setActiveTrips(trips.filter(t => t.status === 'en_curso'));
    setPassengers(passengersData);
    setConductors(conductorsData);
  };

  const handleQRScan = (qrData: string) => {
    try {
      const parsedData = parseQRData(qrData);
      
      const passenger = passengers.find(p => p.cedula === parsedData.cedula);
      
      if (!passenger) {
        setScanResult({
          type: 'error',
          message: `Pasajero con cédula ${parsedData.cedula} no encontrado en el sistema`
        });
        setShowScanner(false);
        return;
      }

      const existingTrip = activeTrips.find(t => t.passengerId === passenger.id);
      
      if (existingTrip) {
        finalizarViaje(existingTrip.id);
        setScanResult({
          type: 'success',
          message: `Viaje finalizado para ${passenger.name}`,
          passenger
        });
      } else {
        iniciarViaje(passenger);
        setScanResult({
          type: 'success',
          message: `Viaje iniciado para ${passenger.name}`,
          passenger
        });
      }
      
      setShowScanner(false);
      
    } catch (error) {
      console.error('Error procesando QR:', error);
      setScanResult({
        type: 'error',
        message: 'Código QR inválido o no reconocido'
      });
      setShowScanner(false);
    }
  };

  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCedula.trim()) {
      setScanResult({
        type: 'error',
        message: 'Por favor ingrese una cédula válida'
      });
      return;
    }

    const passenger = passengers.find(p => p.cedula === manualCedula.trim());
    
    if (!passenger) {
      setScanResult({
        type: 'error',
        message: `Pasajero con cédula ${manualCedula.trim()} no encontrado en el sistema`
      });
      setShowManualEntry(false);
      setManualCedula('');
      return;
    }

    const existingTrip = activeTrips.find(t => t.passengerId === passenger.id);
    
    if (existingTrip) {
      finalizarViaje(existingTrip.id);
      setScanResult({
        type: 'success',
        message: `Viaje finalizado para ${passenger.name}`,
        passenger
      });
    } else {
      iniciarViaje(passenger);
      setScanResult({
        type: 'success',
        message: `Viaje iniciado para ${passenger.name}`,
        passenger
      });
    }
    
    setShowManualEntry(false);
    setManualCedula('');
  };

  const iniciarViaje = (passenger: Passenger) => {
    const conductor = conductors.find(c => c.cedula === user?.cedula);
    
    const newTrip: Trip = {
      id: Date.now().toString(),
      passengerId: passenger.id,
      passengerName: passenger.name,
      passengerCedula: passenger.cedula,
      conductorId: conductor?.id || user?.id || '',
      conductorName: conductor?.name || user?.name || '',
      ruta: conductor?.ruta || 'Ruta no especificada',
      startTime: new Date().toISOString(),
      status: 'en_curso',
      createdAt: new Date().toISOString()
    };

    const trips = storage.getTrips();
    const updatedTrips = [...trips, newTrip];
    storage.saveTrips(updatedTrips);
    
    loadData();
  };

  const finalizarViaje = (tripId: string) => {
    const trips = storage.getTrips();
    const updatedTrips = trips.map(trip => 
      trip.id === tripId 
        ? { ...trip, status: 'finalizado' as const, endTime: new Date().toISOString() }
        : trip
    );
    
    storage.saveTrips(updatedTrips);
    loadData();
  };

  const manualFinalizarViaje = (tripId: string) => {
    if (window.confirm('¿Está seguro de finalizar este viaje?')) {
      finalizarViaje(tripId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Escanear Códigos QR</h1>
          <p className="text-gray-600">Gestione los viajes de los pasajeros</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowManualEntry(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            <span>Ingresar Cédula</span>
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <QrCode className="h-5 w-5" />
            <span>Escanear QR</span>
          </button>
        </div>
      </div>

      {/* Resultado del escaneo */}
      {scanResult && (
        <div className={`p-4 rounded-lg border-l-4 ${
          scanResult.type === 'success' 
            ? 'bg-green-50 border-green-400' 
            : 'bg-red-50 border-red-400'
        }`}>
          <div className="flex items-center">
            {scanResult.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <p className={`font-medium ${
              scanResult.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {scanResult.message}
            </p>
          </div>
          {scanResult.passenger && (
            <div className="mt-2 text-sm text-gray-600">
              <p>Cédula: {scanResult.passenger.cedula}</p>
              <p>Gerencia: {scanResult.passenger.gerencia}</p>
            </div>
          )}
          <button
            onClick={() => setScanResult(null)}
            className="mt-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Viajes Activos</p>
              <p className="text-2xl font-bold text-blue-600">{activeTrips.length}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Pasajeros</p>
              <p className="text-2xl font-bold text-green-600">{passengers.length}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mi Ruta</p>
              <p className="text-sm font-bold text-gray-900">
                {conductors.find(c => c.cedula === user?.cedula)?.ruta || 'No asignada'}
              </p>
            </div>
            <QrCode className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Viajes activos */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Viajes Activos ({activeTrips.length})
          </h2>
        </div>
        
        <div>
          <table className="w-full table-fixed md:table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pasajero
                </th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cédula
                </th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hora Inicio
                </th>
                <th className="px-2 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ruta
                </th>
                <th className="px-2 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeTrips.map((trip) => {
                const passenger = passengers.find(p => p.id === trip.passengerId);
                
                return (
                  <tr key={trip.id} className="hover:bg-gray-50 align-top">
                    <td className="px-2 sm:px-6 py-4 whitespace-nowrap md:whitespace-normal">
                      <div className="font-medium text-gray-900">
                        {passenger?.name || trip.passengerName}
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-4 whitespace-nowrap md:whitespace-normal text-gray-600">
                      {passenger?.cedula || trip.passengerCedula}
                    </td>
                    <td className="px-2 sm:px-6 py-4 whitespace-nowrap md:whitespace-normal text-gray-600">
                      {new Date(trip.startTime).toLocaleTimeString()}
                    </td>
                    <td className="px-2 sm:px-6 py-4 text-gray-600 break-words">
                      <div className="max-w-[140px] sm:max-w-xs md:max-w-none" title={trip.ruta}>
                        {trip.ruta}
                      </div>
                    </td>
                    <td className="px-2 sm:px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => manualFinalizarViaje(trip.id)}
                        className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
                      >
                        Finalizar
                      </button>
                    </td>
                  </tr>
                );
              })}
              
              {activeTrips.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 sm:px-6 py-8 text-center text-gray-500">
                    No hay viajes activos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          Instrucciones de uso
        </h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Use "Ingresar Cédula\" para registrar pasajeros manualmente
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Haga clic en "Escanear QR\" para abrir la cámara
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Apunte la cámara hacia el código QR del pasajero
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Si es la primera vez, se iniciará un nuevo viaje
          </li>
          <li className="flex items-start">
            <span className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
            Si ya tiene un viaje activo, se finalizará automáticamente
          </li>
        </ul>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full md:max-w-sm lg:max-w-md mx-4 md:mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Registrar Pasajero por Cédula
            </h2>
            
            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cédula del Pasajero
                </label>
                <input
                  type="text"
                  value={manualCedula}
                  onChange={(e) => setManualCedula(e.target.value)}
                  placeholder="Ingrese la cédula del pasajero"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  autoFocus
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualCedula('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Registrar
                </button>
              </div>
            </form>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Nota:</strong> El pasajero debe estar previamente registrado en el sistema.
                Si es la primera vez que sube, se iniciará un nuevo viaje.
                Si ya tiene un viaje activo, se finalizará automáticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default ScanQR;