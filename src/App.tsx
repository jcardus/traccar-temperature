
import React, { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ThermometerSnowflake, ThermometerSun, Gauge, RefreshCcw } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
} from "recharts";

/**
 * Traccar – React Preview: Dashboard de Temperatura
 * - Faixa alvo: -18 a -7 °C
 * - Alarmes: leve ≥ -6; médio ≥ -1; grave ≥ +10
 * - Layout: Fleet Overview + Detalhe do Veículo
 */

// ---------- Types ----------
interface Device {
  id: number;
  name: string;
  uniqueId: string;
  status: string;
  lastUpdate: string;
  positionId?: number;
  groupId?: number;
  phone?: string;
  model?: string;
  contact?: string;
  category?: string;
  disabled?: boolean;
  attributes?: Record<string, any>;
}

interface Position {
  id: number;
  deviceId: number;
  protocol: string;
  deviceTime: string;
  fixTime: string;
  serverTime: string;
  outdated: boolean;
  valid: boolean;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  course: number;
  address?: string;
  accuracy?: number;
  network?: any;
  attributes?: Record<string, any>;
}

interface FleetItem {
  id: number;
  placa: string;
  last: Date;
  tempC: number;
  door: number;
  setpoint: number;
}

// ---------- Util ----------
function classificarTemp(tempC: number): "ok" | "leve" | "medio" | "grave" {
  if (tempC >= 10) return "grave";
  if (tempC >= -1) return "medio";
  if (tempC >= -6) return "leve";
  return "ok";
}
function statusFaixa(tempC: number): "abaixo_da_faixa" | "na_faixa" | "acima_da_faixa" {
  if (tempC < -18) return "abaixo_da_faixa";
  if (tempC <= -7) return "na_faixa";
  return "acima_da_faixa";
}
const cores: Record<string, string> = {
  ok: "bg-green-600",
  leve: "bg-yellow-500",
  medio: "bg-orange-500",
  grave: "bg-red-600",
  abaixo_da_faixa: "bg-blue-600",
  na_faixa: "bg-green-600",
  acima_da_faixa: "bg-yellow-500",
};

// ---------- Data Transformation ----------
function transformDeviceToFleetItem(device: Device, position?: Position): FleetItem {
  // Extract temperature from position attributes first, fallback to device attributes
  const posAttrs = position?.attributes ?? {};
  const devAttrs = device.attributes ?? {};

  const tempC = posAttrs.temp1 || posAttrs.bleTemp1;
  const door = posAttrs.door ?? posAttrs.io2 ?? devAttrs.door ?? devAttrs.io2 ?? 0;
  const setpoint = posAttrs.setpoint ?? posAttrs.targetTemp ?? devAttrs.setpoint ?? devAttrs.targetTemp ?? -15;

  return {
    id: device.id,
    placa: device.name || device.uniqueId,
    last: position ? new Date(position.fixTime || position.serverTime) : new Date(device.lastUpdate),
    tempC: typeof tempC === 'number' ? tempC : parseFloat(tempC) || undefined,
    door: typeof door === 'number' ? door : parseInt(door) || 0,
    setpoint: typeof setpoint === 'number' ? setpoint : parseFloat(setpoint) || -15,
  };
}


// ---------- UI helpers ----------
function NivelBadge({ nivel }: { nivel: "ok" | "leve" | "medio" | "grave" }) {
  const map: any = { ok: "Ok", leve: "Leve", medio: "Médio", grave: "Grave" };
  return <Badge className={`${cores[nivel]} text-white`}>{map[nivel]}</Badge>;
}
function FaixaBadge({ s }: { s: "abaixo_da_faixa" | "na_faixa" | "acima_da_faixa" }) {
  const map: any = { abaixo_da_faixa: "Abaixo da Faixa", na_faixa: "Na Faixa", acima_da_faixa: "Acima da Faixa" };
  return <Badge className={`${cores[s]} text-white`}>{map[s]}</Badge>;
}

function GaugeTemp({ temp }: { temp: number }) {
  const nivel = classificarTemp(temp);
  const pct = Math.min(100, Math.max(0, ((temp + 30) / 60) * 100));
  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-1"><Gauge className="h-4 w-4"/><span className="text-sm text-gray-500">Temperatura</span></div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${cores[nivel].replace("bg-", "bg-")}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 text-xl font-semibold">{temp && temp.toFixed(1)} °C</div>
      <div className="text-sm"><NivelBadge nivel={nivel as any} /></div>
    </div>
  );
}

// ---------- Componentes ----------
function FleetTable({ data, onSelect }: { data: any[]; onSelect: (id: number) => void }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return data.filter((d) => d.placa.toLowerCase().includes(query.toLowerCase()));
  }, [data, query]);

  return (
    <Card className="shadow-sm">
      <div className="p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ThermometerSnowflake className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Frota – Temperatura Atual</h2>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Filtrar por placa…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-48" />
          <Button variant="outline" size="icon" onClick={() => setQuery("")}> <RefreshCcw className="h-4 w-4"/> </Button>
        </div>
      </div>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Último update</TableHead>
              <TableHead className="text-right">Temp (°C)</TableHead>
              <TableHead>Status Faixa</TableHead>
              <TableHead>Alarme</TableHead>
              <TableHead>Porta</TableHead>
              <TableHead className="text-right">Setpoint</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((v) => {
              const nivel = classificarTemp(v.tempC);
              const faixa = statusFaixa(v.tempC);
              return (
                <TableRow key={v.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{v.placa}</TableCell>
                  <TableCell>{new Date(v.last).toLocaleString()}</TableCell>
                  <TableCell className="text-right">{v.tempC && v.tempC.toFixed(1)}</TableCell>
                  <TableCell><FaixaBadge s={faixa} /></TableCell>
                  <TableCell><NivelBadge nivel={nivel as any} /></TableCell>
                  <TableCell>{v.door ? "Aberta" : "Fechada"}</TableCell>
                  <TableCell className="text-right">{v.setpoint} °C</TableCell>
                  <TableCell>
                    <Button size="sm" onClick={() => onSelect(v.id)}>Detalhar</Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function VehicleDetail({ id, fleet, historicalData }: { id: number; fleet: FleetItem[]; historicalData: Record<number, any[]> }) {
  const vehicle = fleet.find((v) => v.id === id)!;
  const serie = (historicalData[id] || []).map((p) => ({ ...p, label: new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }));
  const tempAtual = vehicle.tempC;
  const kpis = useMemo(() => {
    if (serie.length === 0) {
      return { min: 0, max: 0, pctFaixa: 0 };
    }
    const temps = serie.map((s: any) => s.tempC);
    const min = parseFloat(Math.min(...temps).toFixed(1));
    const max = parseFloat(Math.max(...temps).toFixed(1));
    const emFaixa = serie.filter((s: any) => s.tempC >= -18 && s.tempC <= -7).length;
    const pctFaixa = Math.round((emFaixa / serie.length) * 1000) / 10;
    return { min, max, pctFaixa };
  }, [serie]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-1">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Placa</div>
              <div className="text-xl font-semibold">{vehicle.placa}</div>
            </div>
            <Badge className="flex items-center gap-1 bg-gray-200">
              <ThermometerSun className="h-4 w-4"/>
              Setpoint {vehicle.setpoint} °C
            </Badge>
          </div>
          <GaugeTemp temp={tempAtual} />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-sm text-gray-500">Temp mín (6h)</div>
              <div className="text-lg font-semibold">{kpis.min.toFixed(1)} °C</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Temp máx (6h)</div>
              <div className="text-lg font-semibold">{kpis.max.toFixed(1)} °C</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">% em Faixa</div>
              <div className="text-lg font-semibold">{kpis.pctFaixa}%</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertTriangle className="h-4 w-4"/>
            <span>Porta: <b>{vehicle.door ? "Aberta" : "Fechada"}</b></span>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <div className="p-4 pb-0 flex items-center justify-between">
          <h3 className="font-semibold">Temperatura (últimas 6h)</h3>
        </div>
        <CardContent className="pt-4">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" interval={5} />
                <YAxis domain={[-25, 20]} tickFormatter={(v) => `${Number(v).toFixed(1)}°`} />
                <Tooltip formatter={(v: any) => `${Number(v).toFixed(1)} °C`} labelFormatter={(l) => `Hora: ${l}`} />
                {/* Bandas da faixa alvo */}
                <ReferenceArea y1={-18} y2={-7} fill="#16a34a" fillOpacity={0.08} />
                {/* Linhas de corte */}
                <ReferenceArea y1={-6} y2={20} fill="#f59e0b" fillOpacity={0.05} />
                <ReferenceArea y1={-1} y2={20} fill="#f97316" fillOpacity={0.08} />
                <ReferenceArea y1={10} y2={20} fill="#dc2626" fillOpacity={0.10} />
                <Line type="monotone" dataKey="tempC" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function App() {
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const [tab, setTab] = useState("fleet");
  const [fleet, setFleet] = useState<FleetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalData, setHistoricalData] = useState<Record<number, any[]>>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Polling interval in milliseconds (30 seconds)
  const POLLING_INTERVAL = 30000;

  const fetchDevices = async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      // Fetch both devices and positions in parallel
      const host = 'web.rastreosat.com.br';
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const [devicesResponse, positionsResponse] = await Promise.all([
        fetch(`https://${host}/api/devices`, {headers: {authorization: 'Bearer ' + token}}),
        fetch(`https://${host}/api/positions`, {headers: {authorization: 'Bearer ' + token}})
      ]);

      const devices: Device[] = await devicesResponse.json();
      const positions: Position[] = await positionsResponse.json();

      // Create a map of positions by deviceId for quick lookup
      const positionsByDevice = new Map<number, Position>();
      positions.forEach(pos => {
        positionsByDevice.set(pos.deviceId, pos);
      });

      // Join devices with their positions
      const fleetData = devices.map(device => {
        const position = positionsByDevice.get(device.id);
        return transformDeviceToFleetItem(device, position);
      });

      setFleet(fleetData);
      setLastUpdate(new Date());

      // Auto-select first device if none selected
      if (fleetData.length > 0 && !selecionado) {
        setSelecionado(fleetData[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
      console.error('Error fetching devices:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Initial load and polling for fleet data
  useEffect(() => {
    fetchDevices(true);

    // Set up polling interval
    const intervalId = setInterval(() => {
      fetchDevices(false);
    }, POLLING_INTERVAL);

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Fetch historical data only when detail tab is open
  useEffect(() => {
    if (!selecionado || tab !== 'detail') return;

    const fetchHistoricalData = async () => {
      try {
        const host = 'web.rastreosat.com.br';
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        // Fetch last 6 hours of data
        const to = new Date();
        const from = new Date(to.getTime() - 6 * 60 * 60 * 1000);

        const response = await fetch(
          `https://${host}/api/positions?deviceId=${selecionado}&from=${from.toISOString()}&to=${to.toISOString()}`,
          { headers: { authorization: 'Bearer ' + token } }
        );

        const positions: Position[] = await response.json();

        // Transform positions to chart format
        const chartData = positions.map(pos => {
          const attrs = pos.attributes ?? {};
          const tempC = attrs.temp1 ?? attrs.temperature ?? attrs.bleTemp1;
          const door = attrs.door ?? attrs.io2 ?? 0;

          return {
            ts: new Date(pos.fixTime || pos.serverTime),
            tempC: typeof tempC === 'number' ? tempC : parseFloat(tempC) || 0,
            door: typeof door === 'number' ? door : parseInt(door) || 0,
            fan: 1
          };
        }).filter(d => !isNaN(d.tempC)); // Filter out invalid temperatures

        setHistoricalData(prev => ({
          ...prev,
          [selecionado]: chartData
        }));
      } catch (err) {
        console.error('Error fetching historical data:', err);
      }
    };

    // Initial fetch
    void fetchHistoricalData();

    // Set up polling interval for historical data only when detail tab is active
    const intervalId = setInterval(() => {
      void fetchHistoricalData();
    }, POLLING_INTERVAL);

    // Cleanup interval when tab changes or device changes
    return () => clearInterval(intervalId);
  }, [selecionado, tab, POLLING_INTERVAL]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <RefreshCcw className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Erro ao carregar dados</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleManualRefresh = () => {
    void fetchDevices(false);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Controle de Temperatura – Baú Frigorífico</h1>
          <p className="text-sm text-gray-500">Faixa alvo <b>-18 a -7 °C</b> · Alarmes: <b>Leve ≥ -6</b> · <b>Médio ≥ -1</b> · <b>Grave ≥ +10</b></p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList>
          <TabsTrigger value="fleet">Frota</TabsTrigger>
          <TabsTrigger value="detail">Detalhe</TabsTrigger>
        </TabsList>
        <TabsContent value="fleet" className="mt-4">
          <FleetTable data={fleet} onSelect={(id) => { setSelecionado(id); setTab("detail"); }} />
        </TabsContent>
        <TabsContent value="detail" className="mt-4">
          {selecionado && <VehicleDetail id={selecionado} fleet={fleet} historicalData={historicalData} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
