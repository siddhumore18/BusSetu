import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getStopsByRoute, getActiveTrips, getRouteById } from '../services/api';
import MapView from '../components/MapView';
import Navbar from '../components/Navbar';
import { ArrowLeft, Bus, Clock, MapPin, RefreshCw, Route, ChevronRight } from 'lucide-react';

const CitizenTrackPage = () => {
  const [searchParams] = useSearchParams();
  const routeId = searchParams.get('routeId');
  const sourceId = searchParams.get('source');
  const destId = searchParams.get('dest');

  const [stops, setStops] = useState([]);
  const [buses, setBuses] = useState([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  const [selectedStop, setSelectedStop] = useState(null);

  // Accurate Haversine distance in km
  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; 
  };

  useEffect(() => {
    if (!routeId) return;
    setLoading(true);
    Promise.all([getRouteById(routeId), getActiveTrips()])
      .then(([routeRes, tripsRes]) => {
        const routeData = routeRes.data;
        const fetchedStops = routeData.stops || [];
        
        const fullStops = [];
        // Inject start point dynamically if exists
        if (routeData.start_point_name && routeData.start_latitude) {
          fullStops.push({
            id: 'start',
            stop_name: routeData.start_point_name,
            latitude: routeData.start_latitude,
            longitude: routeData.start_longitude
          });
        }
        
        // Inject intermediate stops
        fullStops.push(...fetchedStops);
        
        // Inject end point dynamically if exists
        if (routeData.end_point_name && routeData.end_latitude) {
          fullStops.push({
            id: 'end',
            stop_name: routeData.end_point_name,
            latitude: routeData.end_latitude,
            longitude: routeData.end_longitude
          });
        }

        const processedStops = fullStops.length > 0 ? fullStops : fetchedStops;
        
        // Fetch road distances between sequential stops using OSRM
        if (processedStops.length >= 2) {
          const coords = processedStops.map(s => `${s.longitude},${s.latitude}`).join(';');
          fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`)
            .then(res => res.json())
            .then(data => {
              if (data.code === 'Ok' && data.routes?.[0]) {
                const legs = data.routes[0].legs;
                const stopsWithDistance = processedStops.map((stop, i) => ({
                  ...stop,
                  // legs[i-1] is the distance from stop i-1 to stop i
                  roadDistFromPrev: i === 0 ? 0 : (legs[i - 1]?.distance / 1000) || 0
                }));
                setStops(stopsWithDistance);
              } else {
                setStops(processedStops);
              }
            })
            .catch(err => {
              console.error('OSRM Distance Error:', err);
              setStops(processedStops);
            });
        } else {
          setStops(processedStops);
        }

        setBuses(tripsRes.data.filter(t => t.route_id === parseInt(routeId)));
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    const socket = io({ transports: ['websocket'] });
    socketRef.current = socket;
    socket.on('connect', () => { setConnected(true); socket.emit('join_route', routeId); });
    socket.on('disconnect', () => setConnected(false));
    socket.on('bus_position', (data) => {
      setLastUpdate(new Date());
      setBuses(prev => prev.map(bus => bus.id === data.trip_id ? { ...bus, current_lat: data.latitude, current_lng: data.longitude, speed: data.speed } : bus));
    });

    const poll = setInterval(() => {
      getActiveTrips().then(res => {
        setBuses(res.data.filter(t => t.route_id === parseInt(routeId)));
        setLastUpdate(new Date());
      }).catch(console.error);
    }, 10000);

    return () => { socket.disconnect(); clearInterval(poll); };
  }, [routeId]);

  const targetStop = selectedStop || stops.find(s => s.id === parseInt(destId)) || stops[stops.length - 1];
  const activeBus = buses.find(b => b.current_lat);

  const closestStopIndex = (() => {
    if (!activeBus?.current_lat || stops.length === 0) return 0;
    let minIdx = 0;
    let minDist = Infinity;
    stops.forEach((stop, i) => {
      const d = getDistanceInKm(activeBus.current_lat, activeBus.current_lng, stop.latitude, stop.longitude);
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    return minIdx;
  })();

  const calculateETA = (bus, targetStop) => {
    if (!bus?.current_lat || !targetStop || stops.length === 0) return null;
    
    const targetIdx = stops.findIndex(s => s.id === targetStop.id);
    let distanceKm = 0;
    
    if (targetIdx >= closestStopIndex) {
      // 1. Bus to closest stop (Haversine for real-time segment)
      distanceKm = getDistanceInKm(bus.current_lat, bus.current_lng, stops[closestStopIndex].latitude, stops[closestStopIndex].longitude);
      
      // 2. Add road distances for all sequential stops in between
      for (let i = closestStopIndex + 1; i <= targetIdx; i++) {
        distanceKm += stops[i].roadDistFromPrev || getDistanceInKm(stops[i-1].latitude, stops[i-1].longitude, stops[i].latitude, stops[i].longitude);
      }
    } else {
      distanceKm = getDistanceInKm(bus.current_lat, bus.current_lng, targetStop.latitude, targetStop.longitude);
    }

    const busSpeed = parseFloat(bus.speed) || 0;
    const effectiveSpeed = busSpeed > 5 ? busSpeed : 25; 
    const timeHours = distanceKm / effectiveSpeed;
    const timeMin = Math.max(1, Math.round(timeHours * 60));
    return `~${timeMin} min`;
  };

  const eta = calculateETA(activeBus, targetStop);

  if (!routeId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center">
            <Route className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700">No Route Selected</h2>
          <p className="text-slate-500 text-sm text-center">Please select a source & destination to track a bus.</p>
          <Link to="/citizen" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20">
            <ArrowLeft className="w-4 h-4" />Go Back
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Page header */}
      <div className="bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/citizen" className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div className="flex-1">
            <h1 className="font-bold text-slate-800 text-lg">Live Bus Tracking</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 ${connected ? 'text-emerald-600' : 'text-slate-400'}`}>
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'}`} />
                <span className="text-xs font-medium">{connected ? 'Live' : 'Connecting...'}</span>
              </div>
              {lastUpdate && <span className="text-slate-400 text-xs">· Updated {lastUpdate.toLocaleTimeString()}</span>}
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 text-sm font-medium transition-colors px-3 py-2 rounded-lg hover:bg-blue-50">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-8 h-full">

          {/* LEFT SIDEBAR: INFO PANELS */}
          <div className="lg:w-[350px] xl:w-[400px] flex-shrink-0 space-y-6 order-2 lg:order-1">
            
            {/* ETA Card / Route Status */}
            {activeBus && eta ? (
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-lg shadow-blue-600/20">
                <p className="text-white/70 text-xs uppercase tracking-wider font-bold mb-2">
                  Trip Status
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-4xl font-extrabold">{eta}</p>
                    <p className="text-blue-200 text-sm mt-1">{activeBus.bus_number} · {activeBus.speed || 0} km/h</p>
                  </div>
                  <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                </div>
              </div>
            ) : buses.length > 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center gap-4 shadow-sm">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <span className="animate-pulse text-xl">🚌</span>
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">Trip In Progress</p>
                  <p className="text-slate-500 text-sm mt-0.5">Waiting for GPS signal...</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 flex items-center gap-4 shadow-sm">
                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Bus className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-lg">No Active Bus</p>
                  <p className="text-slate-500 text-sm mt-0.5">No buses running currently</p>
                </div>
              </div>
            )}

            {/* Active buses list */}
            {buses.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="px-6 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h3 className="font-bold text-slate-800">Active Buses</h3>
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full">{buses.length} running</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {buses.map(bus => (
                    <div key={bus.id} className="px-6 py-5 flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-lg flex-shrink-0">🚌</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800">{bus.bus_number}</p>
                        <p className="text-slate-500 text-xs truncate mt-0.5">{bus.driver_name}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {bus.current_lat ? (
                          <>
                            <p className="text-blue-600 font-bold mb-1">{bus.speed || 0} km/h</p>
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">Live</span>
                          </>
                        ) : (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">No GPS</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: TIMELINE & MAP */}
          <div className="flex-1 order-1 lg:order-2 flex flex-col gap-8 w-full">

            {/* Exact Uber-Like Trip Progress Timeline */}
            <div className="bg-white rounded-3xl border border-slate-100 p-6 lg:p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-800 mb-8 font-sans tracking-tight">Trip Progress</h2>
              
              <div className="relative z-10">
                {(() => {
                  let runningDistance = 0;
                  
                  return stops.map((stop, index) => {
                    const isCurrent = activeBus && index === closestStopIndex;
                    const isPassed = activeBus && index < closestStopIndex;
                    const isUpcoming = !activeBus || index > closestStopIndex;
                    
                    if (activeBus) {
                       if (isCurrent) {
                          runningDistance = getDistanceInKm(activeBus.current_lat, activeBus.current_lng, stop.latitude, stop.longitude);
                       } else if (isUpcoming && index > 0) {
                          runningDistance += stop.roadDistFromPrev || getDistanceInKm(stops[index-1].latitude, stops[index-1].longitude, stop.latitude, stop.longitude);
                       }
                    }
                    
                    const busSpeed = parseFloat(activeBus?.speed) || 0;
                    const effectiveSpeed = busSpeed > 5 ? busSpeed : 25; // 25km/h avg speed fallback like Google Maps
                    const etaMins = Math.max(1, Math.round((runningDistance / effectiveSpeed) * 60));

                    return (
                    <div key={stop.id} className="relative flex items-center gap-4 pb-10 group" onClick={() => setSelectedStop(stop)}>
                      {/* Vertical line connecting to next */}
                      {index !== stops.length - 1 && (
                        <div className={`absolute left-[15px] top-[30px] bottom-[-10px] w-[2px] -ml-px z-0 ${
                          isPassed || (isCurrent && false) ? 'bg-blue-500' : 'bg-slate-200 border-l-2 border-slate-200 border-dashed'
                        }`} />
                      )}

                      {isCurrent ? (
                        <>
                          {/* Arriving Now Icon */}
                          <div className="relative z-10 w-[30px] h-[30px] bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 ring-4 ring-white shadow-sm mt-0">
                            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white">
                              <Bus className="w-3.5 h-3.5" />
                            </div>
                          </div>
                          
                          {/* Arriving Now Card */}
                          <div className="flex-1 bg-blue-50 rounded-2xl p-4 border border-blue-100 shadow-sm transition-all transform hover:scale-[1.01]">
                             <p className="text-blue-600 text-[13px] font-bold mb-1 tracking-wide">Arriving Now</p>
                             <div className="flex items-center justify-between gap-2">
                               <p className="text-slate-800 font-bold text-lg leading-tight">{stop.stop_name}</p>
                               <span className="bg-red-500 text-white text-xs font-extrabold px-3 py-1.5 rounded-full shadow-sm tracking-wide whitespace-nowrap">
                                  +{etaMins} min
                               </span>
                             </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Normal Icon */}
                          <div className="relative z-10 w-[30px] h-[30px] bg-white rounded-full flex items-center justify-center flex-shrink-0 mt-0">
                            <div className={`w-3.5 h-3.5 rounded-full ring-[4px] ring-offset-2 ${isPassed ? 'bg-blue-500 ring-blue-100' : 'bg-slate-400 ring-slate-100'}`} />
                          </div>

                          {/* Normal Text */}
                          <div className="flex-1 min-w-0 flex flex-col justify-center mt-0">
                            <p className={`text-[17px] font-medium leading-none ${isPassed ? 'text-slate-800' : 'text-slate-500'}`}>{stop.stop_name}</p>
                            <div className="flex items-center gap-1.5 text-sm mt-2">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="text-slate-400 text-sm">{isPassed ? 'Passed' : 'Pending'}</span>
                              {isUpcoming && activeBus && <span className="text-red-500 font-bold ml-1.5">+{etaMins} min</span>}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                });
              })()}
              </div>
            </div>
            
            {/* BELOW: MAP VIEW */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[500px] relative z-0">
              {loading ? (
                <div className="h-full flex items-center justify-center" style={{ minHeight: '500px' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-500 text-sm font-medium">Loading map...</p>
                  </div>
                </div>
              ) : (
                <div style={{ flex: 1, position: 'relative' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                    <MapView stops={stops} buses={buses} sourceId={sourceId} destId={destId} selectedStopId={targetStop?.id} onStopSelect={setSelectedStop} height="100%" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CitizenTrackPage;
