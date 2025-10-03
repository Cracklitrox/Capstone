import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import axios from "axios";

const API_URL = "http://localhost:3001/api/v1";

export const ErrorLogViewer = () => {
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchErrors();
  }, [severityFilter, statusFilter]);

  const fetchErrors = async () => {
    try {
      const token = localStorage.getItem("token");
      const filters = {};
      if (severityFilter !== "all") filters.severity = severityFilter;
      if (statusFilter !== "all") filters.status = statusFilter;

      const params = new URLSearchParams(filters);
      const response = await axios.get(
        `${API_URL}/system/errors?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setErrors(response.data);
    } catch (error) {
      console.error("Error al cargar logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      low: "bg-blue-500",
      medium: "bg-yellow-500",
      high: "bg-orange-500",
      critical: "bg-red-500",
    };
    return colors[severity] || "bg-gray-500";
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <Clock className="h-4 w-4" />,
      in_review: <AlertCircle className="h-4 w-4" />,
      resolved: <CheckCircle2 className="h-4 w-4" />,
    };
    return icons[status] || <XCircle className="h-4 w-4" />;
  };

  if (loading) return <div>Cargando logs...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Logs de Errores del Sistema</CardTitle>
          <div className="flex gap-2">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="in_review">En revisión</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {errors.map((error) => (
            <div
              key={error.id}
              className="p-3 border rounded-lg hover:bg-muted/50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${getSeverityColor(error.severity)}`}
                    />
                    <span className="font-medium text-sm">
                      {error.origin_module}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getStatusIcon(error.status)}
                      <span className="ml-1">{error.status}</span>
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {error.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {new Date(error.timestamp).toLocaleString("es-CL")}
                    </span>
                    {error.users && (
                      <span>
                        {error.users.first_name}{" "}
                        {error.users.paternal_last_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
