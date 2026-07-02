# Tareas Frontend — Juegosdecartas.com.ar

Cambios en el backend que requieren ajustes en el frontend.
Todas las rutas son relativas a `src/app/`.

---

## 1. Pestaña de depósito — reemplazar formulario manual por instrucciones automáticas ⚠️ URGENTE — ROTO EN PRODUCCIÓN

**Archivos:** `pages/profile/profile.component.ts`, `profile.component.html`, `services/wallet.service.ts`

### Por qué es urgente
Revisé el código actual y el formulario de depósito **hoy está roto**: `WalletService.deposit()` solo manda `{ amount }`, pero el backend (`POST /api/wallet/deposit`) requiere también `senderName`, `senderBank` y `transactionId` — cualquier usuario que use el formulario actual va a recibir un error 400. Además la tarjeta muestra un alias y CBU **inventados/hardcodeados** (`juegos.carta.mp`, `0000003100012345678901`) que no son reales.

### Contexto del nuevo flujo
- La plataforma tiene **una sola cuenta de Mercado Pago** con un alias real (configurado en el backend, no hardcodeado en el frontend).
- Cada usuario tiene un **código único** (`JDC-{USERNAME}`) que debe poner como concepto al transferir.
- Mercado Pago le avisa al backend automáticamente vía webhook y el saldo se acredita solo, sin que nadie tenga que aprobar nada a mano.
- Esto reemplaza TODO el formulario manual (monto, titular, banco, comprobante, checkbox, botón de WhatsApp).

### Endpoint a consumir
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

### 1. `services/wallet.service.ts` — agregar método
```typescript
getDepositInfo() {
  return this.http.get<{ alias: string; code: string; instructions: string }>(
    `${this.API}/deposit-info`
  );
}
```
(El método viejo `deposit(amount)` puede quedar — el backend lo sigue teniendo como fallback manual — pero ya no se usa desde esta pantalla.)

### 2. `profile.component.ts` — borrar y reemplazar

**Borrar** (líneas 60–68 actuales y el método `submitDeposit()` + `getWhatsAppDepositLink()`, líneas 174–218):
```typescript
depositAmount        = 0;
depositSenderName    = '';
depositSenderBank    = '';
depositTransactionId = '';
depositAcceptTerms   = false;
depositLoading = signal(false);
depositSuccess = signal(false);
depositError   = signal('');
// ...
submitDeposit() { ... }
getWhatsAppDepositLink(): string { ... }
```

**Agregar** en su lugar:
```typescript
depositInfo = signal<{ alias: string; code: string; instructions: string } | null>(null);
depositCopied = signal<'alias' | 'code' | null>(null);

// dentro de ngOnInit(), junto a las otras llamadas:
this.wallet.getDepositInfo().subscribe({
  next: (info) => this.depositInfo.set(info),
});

copyToClipboard(text: string, which: 'alias' | 'code') {
  navigator.clipboard.writeText(text);
  this.depositCopied.set(which);
  setTimeout(() => this.depositCopied.set(null), 2000);
}
```

### 3. `profile.component.html` — reemplazar todo el bloque `@if (activeTab() === 'deposit') { ... }` (líneas 179–259 actuales)

Sacar: la tarjeta con alias/CBU/banco/titular hardcodeados, el cartel de advertencia de titularidad, el `<form>` completo (monto, titular, banco, comprobante, checkbox), y el botón de WhatsApp.

Reemplazar por algo como:
```html
@if (activeTab() === 'deposit') {
  <div class="deposit-section panel">
    <h3>Cargar Saldo</h3>
    <p class="section-desc" style="color: #a0aec0; font-size: 0.95rem;">
      Transferí desde tu banco o billetera virtual. El saldo se acredita solo, en segundos.
    </p>

    @if (depositInfo(); as info) {
      <div class="transfer-info mt-2">
        <div class="info-row">
          <span class="info-label">Alias:</span>
          <strong class="info-value text-gold">{{ info.alias }}</strong>
          <button type="button" class="btn btn-outline btn-sm" (click)="copyToClipboard(info.alias, 'alias')">
            {{ depositCopied() === 'alias' ? '✓ Copiado' : 'Copiar' }}
          </button>
        </div>
      </div>

      <div class="deposit-warning-box mt-3">
        <span class="warning-icon">⚠️</span>
        <div class="warning-text">
          En el campo <strong>"Concepto"</strong> de la transferencia escribí exactamente este código
          (sin él, tu depósito no se va a acreditar):
        </div>
      </div>

      <div class="deposit-code-box mt-2" style="display:flex; align-items:center; gap: 0.75rem;">
        <strong class="text-gold" style="font-size: 1.3rem; letter-spacing: 1px;">{{ info.code }}</strong>
        <button type="button" class="btn btn-primary btn-sm" (click)="copyToClipboard(info.code, 'code')">
          {{ depositCopied() === 'code' ? '✓ Copiado' : 'Copiar código' }}
        </button>
      </div>

      <p class="text-muted mt-3" style="font-size: 0.9rem;">{{ info.instructions }}</p>
    } @else {
      <p class="text-muted mt-2">Cargando datos de depósito...</p>
    }

    <div class="deposit-help-footer mt-3" style="text-align: center; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1.5rem;">
      <p class="text-muted" style="font-size: 0.9rem;">¿Tuviste algún problema? Escribinos directamente:</p>
      <a href="https://wa.me/5491123456789" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-sm mt-2">
        🟢 Soporte WhatsApp
      </a>
    </div>
  </div>
}
```

Adaptar clases/estilos al diseño existente — lo importante es: mostrar `alias`, mostrar `code` bien grande y copiable, y dejar claro que el concepto es obligatorio.

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
| 1 | Reemplazar pestaña de depósito con el nuevo flujo JDC | 🔴 Urgente — roto en producción |
| 2 | Sacar campo editable de username en perfil | Alta |
| 3 | Agregar `getDepositInfo()` y actualizar tipos en WalletService | Alta |
| 4 | Mostrar "Gratis" para mesas con bet=0 | Media |
| 5 | Banner en dashboard para usuarios con saldo $0 | Media |
