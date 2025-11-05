
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
function transformDeviceToFleetItem(device: Device): FleetItem {
  // Extract temperature from attributes (adjust attribute name as needed)
  const tempC = device.attributes?.temp1 ?? device.attributes?.temperature ?? 0;
  const door = device.attributes?.door ?? device.attributes?.io2 ?? 0;
  const setpoint = device.attributes?.setpoint ?? device.attributes?.targetTemp ?? -15;

  return {
    id: device.id,
    placa: device.name || device.uniqueId,
    last: new Date(device.lastUpdate),
    tempC: typeof tempC === 'number' ? tempC : parseFloat(tempC) || 0,
    door: typeof door === 'number' ? door : parseInt(door) || 0,
    setpoint: typeof setpoint === 'number' ? setpoint : parseFloat(setpoint) || -15,
  };
}

function gerarSerieTemp({ inicio, pontos = 72, media = -12, ruido = 1.2 }:{inicio:string|Date,pontos?:number,media?:number,ruido?:number}) {
  const out: any[] = []; let t = new Date(inicio);
  for (let i = 0; i < pontos; i++) {
    const osc = Math.sin(i / 6) * 0.8;
    const rand = (Math.random() - 0.5) * ruido * 2;
    const door = (i % 9 === 0 || i % 9 === 1) ? 1 : 0; // abre às vezes
    const temp = +(media + osc + rand + (door ? 1.6 : 0)).toFixed(1);
    out.push({ ts: new Date(t), tempC: temp, door, fan: 1 });
    t.setMinutes(t.getMinutes() + 30);
  }
  // injeta um trecho de superaquecimento em um dos veículos para ilustrar
  return out;
}

const seriesPorVeiculo: Record<number, any[]> = {
  101: gerarSerieTemp({ inicio: "2025-09-30T15:10:00-03:00" }),
  102: gerarSerieTemp({ inicio: "2025-09-30T15:10:00-03:00", media: -5.5 }),
  103: gerarSerieTemp({ inicio: "2025-09-30T15:10:00-03:00", media: -3.5 }).map((p, i) =>
    i > 60 ? { ...p, tempC: 10 + Math.random() * 3, door: 1 } : p
  ),
};

const eventsMock = [
  { id: 90001, type: "alarm", time: "2025-09-30 17:12", deviceId: 101, tempC: -5.8, nivel: "leve", door: 1 },
  { id: 90002, type: "alarm", time: "2025-09-30 18:55", deviceId: 102, tempC: -1.0, nivel: "medio", door: 0 },
  { id: 90003, type: "alarm", time: "2025-09-30 20:58", deviceId: 103, tempC: 11.2, nivel: "grave", door: 1 },
];

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
      <div className="mt-2 text-xl font-semibold">{temp.toFixed(1)} °C</div>
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
                  <TableCell className="text-right">{v.tempC.toFixed(1)}</TableCell>
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

function VehicleDetail({ id, fleet }: { id: number; fleet: FleetItem[] }) {
  const vehicle = fleet.find((v) => v.id === id)!;
  const serie = seriesPorVeiculo[id]?.map((p) => ({ ...p, label: new Date(p.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) })) || [];
  const tempAtual = vehicle.tempC;
  const kpis = useMemo(() => {
    const temps = serie.map((s: any) => s.tempC);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const emFaixa = serie.filter((s: any) => s.tempC >= -18 && s.tempC <= -7).length;
    const pctFaixa = Math.round((emFaixa / serie.length) * 1000) / 10;
    return { min, max, pctFaixa };
  }, [serie]);

  const evs = eventsMock.filter((e) => e.deviceId === id);

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
                <YAxis domain={[-25, 20]} tickFormatter={(v) => `${v}°`} />
                <Tooltip formatter={(v: any) => `${v} °C`} labelFormatter={(l) => `Hora: ${l}`} />
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

      <Card className="xl:col-span-3">
        <div className="p-4 pb-0 flex items-center justify-between">
          <h3 className="font-semibold">Eventos (mock)</h3>
        </div>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Temp</TableHead>
                <TableHead>Porta</TableHead>
                <TableHead>Descrição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {evs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500">Sem eventos no período.</TableCell>
                </TableRow>
              )}
              {evs.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.time}</TableCell>
                  <TableCell><NivelBadge nivel={e.nivel as any} /></TableCell>
                  <TableCell>{e.tempC.toFixed(1)} °C</TableCell>
                  <TableCell>{e.door ? "Aberta" : "Fechada"}</TableCell>
                  <TableCell>{e.nivel === "grave" ? "Temperatura perigosa (≥ +10 °C)" : e.nivel === "medio" ? "Acima de -1 °C" : "Acima de -6 °C"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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

  useEffect(() => {
    async function fetchDevices() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/devices');

        const devices: Device[] = await response.json();
        const fleetData = devices.map(transformDeviceToFleetItem);
        setFleet(fleetData);

        // Auto-select first device if none selected
        if (fleetData.length > 0 && !selecionado) {
          setSelecionado(fleetData[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch devices');
        console.error('Error fetching devices:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDevices();
  }, []);

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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Controle de Temperatura – Baú Frigorífico</h1>
          <p className="text-sm text-gray-500">Faixa alvo <b>-18 a -7 °C</b> · Alarmes: <b>Leve ≥ -6</b> · <b>Médio ≥ -1</b> · <b>Grave ≥ +10</b></p>
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
          {selecionado && <VehicleDetail id={selecionado} fleet={fleet} />}
        </TabsContent>
      </Tabs>

      <div className="text-xs text-gray-500">
        <p>
          Conectado à API Traccar. Dados obtidos de <code>/api/devices</code>.
          Atributos mapeados: <code>attributes.temp1 → tempC</code>, <code>attributes.door → door</code>.
        </p>
      </div>
    </div>
  );
}
