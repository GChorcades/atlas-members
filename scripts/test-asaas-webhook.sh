#!/usr/bin/env bash
# Dispara um evento simulado da Asaas para o webhook local.
# Uso:
#   ./scripts/test-asaas-webhook.sh PAYMENT_RECEIVED aluno@email.com 99.90
#   ./scripts/test-asaas-webhook.sh PAYMENT_OVERDUE  aluno@email.com
#   ./scripts/test-asaas-webhook.sh SUBSCRIPTION_RENEWED aluno@email.com 49.90

set -e

EVENT="${1:-PAYMENT_RECEIVED}"
EMAIL="${2:-test@example.com}"
VALUE="${3:-99.90}"
URL="${URL:-http://localhost:3001/api/webhooks/asaas}"

# Random IDs to simulate Asaas
PAYMENT_ID="pay_test_$(date +%s)"
CUSTOMER_ID="cus_test_$(date +%s)"

echo "→ Disparando $EVENT"
echo "  email: $EMAIL · valor: R$ $VALUE"
echo "  URL:   $URL"
echo ""

curl -sS -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "x-test-mode: 1" \
  -d @- <<EOF | python3 -m json.tool 2>/dev/null || cat
{
  "event": "$EVENT",
  "customerEmail": "$EMAIL",
  "payment": {
    "id": "$PAYMENT_ID",
    "customer": "$CUSTOMER_ID",
    "value": $VALUE,
    "billingType": "PIX",
    "status": "RECEIVED",
    "description": "Teste — $EVENT"
  }
}
EOF

echo ""
echo "✓ Pronto. Verifique o log do servidor em outro terminal."
