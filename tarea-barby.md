# Tareas Frontend — Juegosdecartas.com.ar

Cambios en el backend que requieren ajustes en el frontend.
Todas las rutas son relativas a `src/app/`.

---

## 1. Pestaña de depósito — reemplazar formulario manual por instrucciones automáticas

**Archivo:** `pages/profile/profile.component.ts` y `profile.component.html`

### Contexto
El flujo de depósito cambió completamente. Ya no existe el formulario donde el usuario declaraba la transferencia manualmente. Ahora:

- La plataforma tiene **una sola cuenta de Mercado Pago** con un alias fijo.
- Cada usuario tiene un **código único** (`JDC-{USERNAME}`) que debe poner como concepto al transferir.
- Cuando la transferencia llega, Mercado Pago notifica al backend automáticamente y el saldo se acredita solo.

### Endpoint nuevo
```
GET /api/wallet/deposit-info
Authorization: Bearer {token}

Respuesta:
{
  "alias": "juegosdecartas",
  "code": "JDC-GUSTAVO",
  "instructions": "Transferí a \"juegosdecartas\" y escribí el código como concepto obligatorio."
}
```

### Qué sacar del componente
Eliminar completamente estos signals y toda su lógica:
```typescript
// BORRAR ESTOS:
depositSenderName = signal<string>('');
depositSenderBank = signal<string>('');
depositTransactionId = signal<string>('');
depositAcceptTerms = signal<boolean>(false);
depositSuccess = signal<boolean>(false);
depositError = signal<string>('');
submitDeposit() { ... }
getWhatsAppDepositLink() { ... }
```

### Qué agregar
```typescript
depositInfo = signal<{ alias: string; code: string; instructions: string } | null>(null);

ngOnInit() {
  // agregar junto a las otras llamadas:
  this.http.get<any>(`${environment.apiUrl}/wallet/deposit-info`).subscribe({
    next: (info) => this.depositInfo.set(info),
  });
}
```

### Cómo debe verse la pestaña "Depósito" en el HTML
Reemplazar el formulario actual por esto (adaptar al diseño existente):

```
┌─────────────────────────────────────────────────────┐
│  ¿Cómo cargar saldo?                                │
│                                                     │
│  1. Abrí tu banco o Mercado Pago                    │
│  2. Transferí el monto que quieras a:               │
│                                                     │
│     Alias: juegosdecartas          [Copiar]         │
│                                                     │
│  3. En el campo "Concepto" escribí exactamente:     │
│                                                     │
│     ┌───────────────────────────────┐               │
│     │  JDC-GUSTAVO                  │  [Copiar]     │
│     └───────────────────────────────┘               │
│                                                     │
│  ⚠ El concepto es obligatorio. Sin él tu           │
│    depósito no se va a acreditar automáticamente.  │
│                                                     │
│  El saldo se acredita en segundos de forma          │
│  automática una vez confirmada la transferencia.    │
└─────────────────────────────────────────────────────┘
```

Agregar un botón "Copiar" que copie al portapapeles con `navigator.clipboard.writeText(...)`.

---

## 2. Perfil — sacar el campo de cambio de username

**Archivo:** `pages/profile/profile.component.html` (y `.ts` si tiene lógica asociada)

El backend ya no acepta cambios de username. El username es permanente desde el registro.

- **Sacar** cualquier `<input>` o campo editable de username en el perfil.
- **Mostrar** el username como texto plano no editable (solo informativo).
- El único campo editable del perfil sigue siendo el **avatar**.

---

## 3. WalletService — agregar método getDepositInfo y actualizar tipos

**Archivo:** `services/wallet.service.ts`

### Agregar método
```typescript
getDepositInfo() {
  return this.http.get<{ alias: string; code: string; instructions: string }>(
    `${this.API}/deposit-info`
  );
}
```

### Actualizar el tipo WalletMovement
El tipo actual está incompleto. Falta agregar los movimientos de Texas Hold'em y torneos:
```typescript
// REEMPLAZAR el tipo actual por:
export interface WalletMovement {
  type:
    | 'deposit' | 'withdraw'
    | 'game-win' | 'game-loss'
    | 'holdem-buyin' | 'holdem-cashout'
    | 'tournament-entry' | 'tournament-refund'
    | 'tournament-win' | 'tournament-finalist';
  amount: number;
  created_at: string;
}
```

### También en profile.component.ts, actualizar movementLabel()
```typescript
movementLabel(type: string): string {
  const labels: Record<string, string> = {
    'deposit':              '+ Depósito',
    'withdraw':             '- Retiro',
    'game-win':             '+ Ganancia Chinchón',
    'game-loss':            '- Pérdida Chinchón',
    'holdem-buyin':         '- Buy-in Hold\'em',
    'holdem-cashout':       '+ Cashout Hold\'em',
    'tournament-entry':     '- Inscripción torneo',
    'tournament-refund':    '+ Reembolso torneo',
    'tournament-win':       '+ Premio campeón',
    'tournament-finalist':  '+ Premio finalista',
  };
  return labels[type] ?? type;
}
```

---

## 4. Mesas de Chinchón — mostrar "Gratis" cuando la apuesta es $0

**Archivos:** `pages/tables/tables.component.html`, `components/table-card/table-card.component.html`

El backend ya acepta mesas con `bet = 0`. El array `BETS` en `tables.component.ts` ya incluye el `0`.

Ajustes de presentación:
- En el selector de apuesta del modal de creación, mostrar **"Gratis"** en lugar de `$0`.
- En la lista de mesas y en `TableCardComponent`, mostrar **"Gratis"** en lugar de `$0` cuando `bet === 0`.

Ejemplo en HTML:
```html
<!-- En el selector de apuesta -->
<option [value]="0">Gratis</option>

<!-- En la tarjeta de mesa -->
{{ table.bet === 0 ? 'Gratis' : (table.bet | number) + ' monedas' }}
```

---

## 5. Dashboard — manejar saldo inicial $0

**Archivo:** `pages/dashboard/dashboard.component.html`

Los nuevos usuarios arrancan con **$0 de saldo**. Verificar que el dashboard no muestre estados raros con saldo cero (por ejemplo, un `0%` de win rate o un balance vacío).

Sugerencia: si el saldo es 0, mostrar un banner o botón destacado que lleve a la pestaña de depósito del perfil:

```
┌──────────────────────────────────────────────────┐
│  💰 Tu saldo es $0                               │
│  Cargá créditos para empezar a jugar             │
│  [Cargar saldo]  →  /perfil?tab=deposit          │
└──────────────────────────────────────────────────┘
```

---

## Resumen de prioridades

| # | Tarea | Prioridad |
|---|-------|-----------|
| 1 | Reemplazar pestaña de depósito con el nuevo flujo JDC | Alta |
| 2 | Sacar campo editable de username en perfil | Alta |
| 3 | Agregar `getDepositInfo()` y actualizar tipos en WalletService | Alta |
| 4 | Mostrar "Gratis" para mesas con bet=0 | Media |
| 5 | Banner en dashboard para usuarios con saldo $0 | Media |
