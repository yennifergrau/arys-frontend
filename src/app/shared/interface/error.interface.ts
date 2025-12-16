export interface OperationStatus {
  code: string;
  description: string;
}

export const operationStatuses: OperationStatus[] = [
  { code: "WAIT", description: "Operación en espera de validación de código" },
  { code: "AG09", description: "Pago no recibido" },
  { code: "AC00", description: "Operación en espera de respuesta del receptor" },
  { code: "AB01", description: "Tiempo de espera agotado" },
  { code: "AB07", description: "Agente fuera de línea" },
  { code: "AC01", description: "Número de cuenta incorrecto" },
  { code: "AC04", description: "Cuenta cancelada" },
  { code: "AC06", description: "Cuenta bloqueada" },
  { code: "AC09", description: "Moneda no válida" },
  { code: "AG10", description: "Agente suspendido o excluido" },
  { code: "AM02", description: "Monto de la transacción no permitido" },
  { code: "AM03", description: "Moneda no permitida" },
  { code: "AM04", description: "Saldo insuficiente" },
  { code: "AM05", description: "Operación duplicada" },
  { code: "BE01", description: "Datos del cliente no corresponden a la cuenta" },
  { code: "BE20", description: "Longitud del nombre inválida" },
  { code: "CH20", description: "Número de decimales incorrecto" },
  { code: "DU01", description: "Identificación de mensaje duplicado" },
  { code: "ED05", description: "Liquidación fallida" },
  { code: "FF05", description: "Código del producto incorrecto" },
  { code: "FF07", description: "Código del subproducto incorrecto" },
  { code: "RC08", description: "Código del banco no existe en el sistema de compensación / liquidación" },
  { code: "TKCM", description: "Código único de operación de débito incorrecto" },
  { code: "TM01", description: "Fuera del horario permitido" },
  { code: "VE01", description: "Rechazo técnico" },
  { code: "DT03", description: "Fecha de procesamiento no bancaria no válida" },
  { code: "TECH", description: "Error técnico al procesar liquidación" },
  { code: "AG01", description: "Transacción restringida" },
  { code: "MD09", description: "Afiliación inactiva" },
  { code: "MD15", description: "Monto incorrecto" },
  { code: "MD21", description: "Cobro no permitido" },
  { code: "CUST", description: "Cancelación solicitada por el deudor" },
  { code: "DS02", description: "Operación cancelada" },
  { code: "MD01", description: "No posee afiliación" },
  { code: "MD22", description: "Afiliación suspendida" },
  { code: "MBE01", description: "El cliente pagador no se encuentra afiliado al servicio de cobro inmediato" }
];
