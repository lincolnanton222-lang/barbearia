# NOIR BARBER CLUB — versão "vivo" (agendamento pelo WhatsApp)

A mesma landing page premium da versão original, com paleta mais viva e **sem sistema de agendamento**: todo agendamento vai direto para o WhatsApp do dono.

## Estrutura

```
noir-barber-vivo/
├── index.html
├── css/style.css     # paleta viva: âmbar/laranja + vermelho e azul do poste de barbeiro
├── js/main.js        # configuração, interface, fundo interativo, animações GSAP
└── assets/images/    # favicon e imagem reserva
```

## Como executar no VS Code

1. Abra a pasta `noir-barber-vivo` no VS Code.
2. Instale a extensão **Live Server**.
3. Clique com o botão direito em `index.html` → **Open with Live Server**.

## Onde configurar (topo de `js/main.js`)

| O quê | Onde |
|---|---|
| WhatsApp do dono | `const WHATSAPP_NUMBER = '5511999999999';` (é a única ocorrência no código) |
| Nome e descrição do dono | `NOIR_CONFIG.owner` |
| Mensagem padrão dos botões | `NOIR_CONFIG.whatsapp.defaultMessage` (`{owner}`, se usado, vira o primeiro nome do dono) |
| Mensagem dos cards de serviço | `NOIR_CONFIG.whatsapp.serviceMessage` (`{service}` e `{price}` são preenchidos sozinhos) |
| Serviços e preços | `NOIR_CONFIG.services` |
| Endereço, mapa, horários | `NOIR_CONFIG.address`, `NOIR_CONFIG.map`, `NOIR_CONFIG.businessHours` (o status aberto/fechado usa o fuso `timeZone`, America/Sao_Paulo) |
| Cores | variáveis no início de `css/style.css` (`--primary`, `--primary-light`, `--primary-dark`, `--red`, `--blue`) |

## Botões de WhatsApp

Todos abrem a conversa com o número do dono, já com uma mensagem pronta:

- **Menu, hero, seção "Agende seu horário", rodapé e botão flutuante:** mensagem padrão de agendamento.
- **Cada card de serviço:** mensagem com o nome e o preço do serviço.
- **Card "Na dúvida sobre qual escolher?":** pedido de recomendação.

## Mapa 3D

A seção de localização traz um mapa 3D interativo (MapLibre GL + OpenFreeMap, sem chave de API): prédios em relevo, câmera inclinada, botões **3D/2D**, **Girar** e **Centralizar**, um pino no ponto exato e atalhos para Google Maps e Waze.

- **Ponto exato:** edite `NOIR_CONFIG.map.coordinates` em `js/main.js`. No Google Maps, clique com o botão direito na porta da barbearia e clique nos números (latitude, longitude) para copiar. As coordenadas que vêm no projeto são aproximadas.
- **Câmera:** `zoom`, `pitch` (inclinação) e `bearing` (rotação inicial).
- **Desempenho:** a biblioteca só é baixada quando o visitante chega perto da seção.
- **Fallback:** se o navegador não tiver WebGL ou o serviço de mapas não responder, aparece o mapa do Google em satélite no mesmo lugar.
- No celular, mover o mapa exige dois dedos, para não atrapalhar a rolagem da página.

## Cards de serviço estáticos

O `index.html` traz os cards de serviço escritos no próprio HTML, para SEO e para quem está sem JavaScript. Ao carregar, o `main.js` troca esses cards pelos de `NOIR_CONFIG.services`, com a mesma aparência. Ao mudar preços ou serviços, atualize os dois lugares. Os links `wa.me` desses cards estáticos (e o `tel:` do contato) também trazem o número escrito: troque-o ali se mudar `WHATSAPP_NUMBER`.

## Imagens

As fotos vêm do [Pexels](https://www.pexels.com/license/) (uso gratuito). Para usar fotos próprias, salve-as em `assets/images/` e troque o `src` no `index.html`. Se alguma foto falhar, a imagem reserva entra no lugar automaticamente.

Os nomes de pessoas e os depoimentos são fictícios.
