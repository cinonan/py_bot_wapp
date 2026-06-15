const whatsappService = require('../services/whatsappService');
const stateService = require('../services/stateService');
const clientModel = require('../models/clientModel');
const productModel = require('../models/productModel');
const orderModel = require('../models/orderModel');

const STATE = {
  AWAITING_NAME: 'AWAITING_NAME',
  AWAITING_ADDRESS: 'AWAITING_ADDRESS',
  CONFIRMING_ADDRESS: 'CONFIRMING_ADDRESS',
  PROVIDING_MENU: 'PROVIDING_MENU',
  SELECTING_PRODUCT: 'SELECTING_PRODUCT',
  AWAITING_QUANTITY: 'AWAITING_QUANTITY',
  AWAITING_DELIVERY_ADDRESS: 'AWAITING_DELIVERY_ADDRESS',
  CONFIRMING_ORDER: 'CONFIRMING_ORDER',
};

function normalizePhoneDigits(rawPhone) {
  return String(rawPhone ?? '').replace(/\D/g, '');
}

function normalizeText(text) {
  return String(text ?? '').trim();
}

function parsePositiveInteger(text) {
  const normalized = normalizeText(text);
  if (!/^\d+$/.test(normalized)) return null;
  const value = Number(normalized);
  if (!Number.isInteger(value) || value <= 0) return null;
  return value;
}

function calculateCartSubtotal(items = []) {
  return items.reduce((acc, item) => {
    const quantity = Number(item?.cantidad) || 0;
    const price = Number(item?.precio) || 0;
    return acc + quantity * price;
  }, 0);
}

function getDeliveryAddressForOrder(metadata = {}) {
  if (metadata.direccionEntrega) {
    return String(metadata.direccionEntrega).trim();
  }
  const selected = metadata.selectedAddress;
  if (selected && selected !== 'NUEVA_PENDIENTE') {
    return String(selected).trim();
  }
  return '';
}

function parseBoletaDniResponse(text) {
  const normalized = normalizeText(text);
  if (!normalized) return { kind: 'invalid' };

  if (normalized.toLowerCase() === 'no') {
    return { kind: 'skip' };
  }

  if (/^\d{8}$/.test(normalized)) {
    return { kind: 'dni', value: normalized };
  }

  return { kind: 'invalid' };
}

function parseIncomingMessage(req) {
  const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return null;

  const from = normalizePhoneDigits(message.from);
  const text = normalizeText(message.text?.body);
  if (!from || !text) return null;

  return { from, text };
}

/** HU-04: comando "Despachar [ID]" (solo dígitos del ID). */
function parseDespacharCommand(text) {
  const normalized = normalizeText(text);
  const match = normalized.match(/^despachar\s+(\d+)$/i);
  if (!match) return null;
  return Number(match[1]);
}

const DISPATCH_CUSTOMER_MESSAGE =
  '¡Buenas noticias! Tu pedido de El Sabor de la Selva está en camino.';

/**
 * Despacho autorizado: solo whatsappService.ADMIN_ORDER_NOTIFY_PHONE (+51942851871).
 */
async function handleAdminDispatchCommand(orderId, adminFrom) {
  try {
    const { rowCount } = await orderModel.updateOrderStatus(orderId, 'entregado');
    if (rowCount === 0) {
      await whatsappService.sendMessage(
        adminFrom,
        `No encontré el pedido #${orderId}. Verifica el ID.`
      );
      return;
    }

    const orderRow = await orderModel.getOrderWithCustomer(orderId);
    const customerPhone = orderRow?.telefono_cliente ?? orderRow?.cliente;
    if (!customerPhone) {
      await whatsappService.sendMessage(
        adminFrom,
        `El pedido #${orderId} se marcó como entregado, pero no hay teléfono de cliente para notificar.`
      );
      return;
    }

    await whatsappService.sendMessage(customerPhone, DISPATCH_CUSTOMER_MESSAGE);
    await whatsappService.sendMessage(
      adminFrom,
      `Notificación enviada: el cliente recibió el aviso de despacho del pedido #${orderId}.`
    );
  } catch (err) {
    console.error('[webhookController.handleAdminDispatchCommand]', err.message);
    await whatsappService.sendMessage(
      adminFrom,
      'Hubo un error al procesar el despacho. Intenta de nuevo en unos minutos.'
    );
  }
}

async function showMenuAndOpenSelection(from, metadata = {}, introMessage = '') {
  const products = await productModel.getAllProducts();
  const body = `${introMessage}${whatsappService.formatMenuMessage(products)}`;
  await whatsappService.sendTextMessage(from, body);
  await stateService.setUserState(from, STATE.SELECTING_PRODUCT, metadata);
}

async function startFlow(from) {
  const client = await clientModel.findByPhone(from);

  if (!client) {
    await stateService.setUserState(from, STATE.AWAITING_NAME, {});
    await whatsappService.sendTextMessage(
      from,
      'Hola, para registrarte necesito tus datos.\nPor favor envía tu Nombre y Apellidos.'
    );
    return;
  }

  await stateService.setUserState(from, STATE.CONFIRMING_ADDRESS, {
    name: client.nombre,
    savedAddress: client.direccion_principal || '',
  });

  await whatsappService.sendTextMessage(
    from,
    `Hola ${client.nombre}, te damos la bienvenida de nuevo.\n¿Usarás tu dirección guardada o una nueva?\nResponde: MISMA o NUEVA.`
  );
}

async function handleAwaitingName(from, text) {
  await stateService.setUserState(from, STATE.AWAITING_ADDRESS, { name: text });
  await whatsappService.sendTextMessage(
    from,
    'Gracias. Ahora envía tu dirección principal.'
  );
}

async function handleAwaitingAddress(from, text, currentMetadata) {
  const name = normalizeText(currentMetadata?.name);
  if (!name) {
    await stateService.setUserState(from, STATE.AWAITING_NAME, {});
    await whatsappService.sendTextMessage(
      from,
      'Necesito validar tu nombre primero.\nPor favor envía tu Nombre y Apellidos.'
    );
    return;
  }

  await clientModel.createClient(from, name, text);
  await stateService.clearCart(from);

  await showMenuAndOpenSelection(from, { name }, `Registro completado, ${name}.\n`);
}

async function handleConfirmingAddress(from, text, currentMetadata) {
  const answer = normalizeText(text).toLowerCase();

  if (answer === 'misma') {
    await stateService.clearCart(from);
    const metadata = {
      name: currentMetadata?.name || '',
      selectedAddress: currentMetadata?.savedAddress || '',
    };
    await showMenuAndOpenSelection(
      from,
      metadata,
      'Perfecto, usaré tu dirección guardada.\n'
    );
    return;
  }

  if (answer === 'nueva') {
    await stateService.clearCart(from);
    const metadata = {
      name: currentMetadata?.name || '',
      selectedAddress: 'NUEVA_PENDIENTE',
    };
    await showMenuAndOpenSelection(
      from,
      metadata,
      'Entendido, usarás una dirección nueva para este pedido.\n'
    );
    return;
  }

  await whatsappService.sendTextMessage(
    from,
    'Respuesta no válida. Por favor responde: MISMA o NUEVA.'
  );
}

async function handleSelectingProduct(from, text, currentMetadata) {
  const productId = parsePositiveInteger(text);
  if (!productId) {
    await whatsappService.sendTextMessage(
      from,
      'ID de producto inválido. Responde solo con el número del producto del menú.'
    );
    return;
  }

  const product = await productModel.getProductById(productId);
  if (!product) {
    await whatsappService.sendTextMessage(
      from,
      'No encontré ese producto. Por favor elige un ID válido del menú.'
    );
    return;
  }

  const metadata = {
    ...currentMetadata,
    selectedProduct: {
      id: Number(product.id),
      nombre: product.nombre,
      precio: Number(product.precio),
    },
  };

  await stateService.setUserState(from, STATE.AWAITING_QUANTITY, metadata);
  await whatsappService.sendTextMessage(
    from,
    `Indica la cantidad para *${product.nombre}* (${whatsappService.formatCurrency(
      product.precio
    )} c/u).`
  );
}

async function handleAwaitingQuantity(from, text, currentMetadata) {
  const quantity = parsePositiveInteger(text);
  if (!quantity) {
    await whatsappService.sendTextMessage(
      from,
      'Cantidad inválida. Debe ser un número entero mayor a 0. Ejemplo: 2'
    );
    return;
  }

  const selectedProduct = currentMetadata?.selectedProduct;
  if (!selectedProduct?.id) {
    await stateService.setUserState(from, STATE.SELECTING_PRODUCT, currentMetadata);
    await whatsappService.sendTextMessage(
      from,
      'Perdí el producto seleccionado. Elige nuevamente un ID del menú.'
    );
    return;
  }

  const item = {
    id: Number(selectedProduct.id),
    nombre: selectedProduct.nombre,
    precio: Number(selectedProduct.precio),
    cantidad: quantity,
  };

  await stateService.addToCart(from, item);
  const cart = await stateService.getCart(from);
  const subtotal = calculateCartSubtotal(cart);

  const metadata = {
    ...currentMetadata,
  };
  delete metadata.selectedProduct;

  await stateService.setUserState(from, STATE.PROVIDING_MENU, metadata);

  const addedLine = whatsappService.formatCartItem(item);
  const cartSummary = whatsappService.formatCartSummary(cart);
  await whatsappService.sendTextMessage(
    from,
    `Agregado al carrito: ${addedLine}\n\nTu carrito:\n${cartSummary}\n\nSubtotal acumulado: *${whatsappService.formatCurrency(
      subtotal
    )}*\n\n¿Deseas agregar algo más?\n1. Ver Menú\n2. Confirmar Pedido`
  );
}

async function handleProvidingMenu(from, text, currentMetadata) {
  const answer = normalizeText(text);

  if (answer === '1') {
    await showMenuAndOpenSelection(from, currentMetadata, '');
    return;
  }

  if (answer === '2') {
    const cart = await stateService.getCart(from);
    if (!cart.length) {
      await whatsappService.sendTextMessage(
        from,
        'Tu carrito está vacío. Primero agrega al menos un producto.'
      );
      return;
    }

    if (currentMetadata?.selectedAddress === 'NUEVA_PENDIENTE') {
      await stateService.setUserState(
        from,
        STATE.AWAITING_DELIVERY_ADDRESS,
        currentMetadata
      );
      await whatsappService.sendTextMessage(
        from,
        'Para este pedido necesito la dirección de entrega. Envíala en un solo mensaje.'
      );
      return;
    }

    await stateService.setUserState(from, STATE.CONFIRMING_ORDER, currentMetadata);
    await whatsappService.sendTextMessage(
      from,
      '¿Deseas boleta con DNI? Escribe el número o responde "No".'
    );
    return;
  }

  await whatsappService.sendTextMessage(
    from,
    'Responde con una opción válida:\n1. Ver Menú\n2. Confirmar Pedido'
  );
}

async function handleAwaitingDeliveryAddress(from, text, currentMetadata) {
  const address = normalizeText(text);
  if (!address) {
    await whatsappService.sendTextMessage(
      from,
      'La dirección no puede estar vacía. Envía la dirección completa de entrega.'
    );
    return;
  }

  await clientModel.updateMainAddress(from, address);

  const metadata = {
    ...currentMetadata,
    direccionEntrega: address,
    selectedAddress: address,
  };

  await stateService.setUserState(from, STATE.CONFIRMING_ORDER, metadata);
  await whatsappService.sendTextMessage(
    from,
    '¿Deseas boleta con DNI? Escribe el número o responde "No".'
  );
}

async function handleConfirmingOrder(from, text, currentMetadata) {
  const cart = await stateService.getCart(from);
  if (!cart.length) {
    await stateService.setUserState(from, STATE.PROVIDING_MENU, currentMetadata);
    await whatsappService.sendTextMessage(
      from,
      'Tu carrito quedó vacío. Agrega productos con la opción 1 (Ver Menú).'
    );
    return;
  }

  const parsed = parseBoletaDniResponse(text);
  if (parsed.kind === 'invalid') {
    await whatsappService.sendTextMessage(
      from,
      'Si deseas boleta con DNI, escribe exactamente 8 dígitos. Si no, responde "No".'
    );
    return;
  }

  const deliveryAddress = getDeliveryAddressForOrder(currentMetadata);
  if (!deliveryAddress) {
    await whatsappService.sendTextMessage(
      from,
      'No tengo una dirección de entrega válida para este pedido. Escribe "hola" para reiniciar.'
    );
    return;
  }

  const subtotal = calculateCartSubtotal(cart);
  const orderItems = cart.map((item) => ({
    id: Number(item.id),
    cantidad: Number(item.cantidad),
    precio: Number(item.precio),
  }));

  const client = await clientModel.findByPhone(from);
  const customerName = currentMetadata?.name || client?.nombre || '';

  try {
    const { id: orderId } = await orderModel.createOrderWithDetails(
      {
        cliente: from,
        total: subtotal,
        estado: 'pendiente',
        direccion_entrega: deliveryAddress,
      },
      orderItems
    );

    if (parsed.kind === 'dni') {
      try {
        await clientModel.updateDni(from, parsed.value);
      } catch (dniErr) {
        console.error('[webhookController] updateDni:', dniErr.message);
        await whatsappService.sendTextMessage(
          from,
          'Tu pedido quedó registrado, pero no pudimos guardar el DNI (puede estar duplicado). Si necesitas boleta, contacta a la tienda.'
        );
      }
    }

    await stateService.clearCart(from);
    await stateService.clearUserState(from);

    await whatsappService.notifyOrderPlacedAndAdmin({
      customerPhone: from,
      orderId,
      customerName,
      deliveryAddress,
      cartItems: cart,
      subtotal,
    });
  } catch (err) {
    console.error('[webhookController.handleConfirmingOrder]', err.message);
    await whatsappService.sendTextMessage(
      from,
      'Hubo un error técnico al registrar tu pedido. Tu carrito sigue guardado; intenta de nuevo en unos minutos.'
    );
  }
}

async function handleWebhook(req, res) {
  try {
    const incoming = parseIncomingMessage(req);
    if (!incoming) {
      res.sendStatus(200);
      return;
    }

    const { from, text } = incoming;

    const despachoOrderId = parseDespacharCommand(text);
    if (despachoOrderId !== null) {
      if (from !== whatsappService.ADMIN_ORDER_NOTIFY_PHONE) {
        await whatsappService.sendMessage(
          from,
          'No tienes permiso para usar el comando de despacho.'
        );
        res.sendStatus(200);
        return;
      }
      await handleAdminDispatchCommand(despachoOrderId, from);
      res.sendStatus(200);
      return;
    }

    const session = await stateService.getUserSession(from);
    const currentState = session?.state || null;
    const currentMetadata = session?.metadata || {};

    if (!currentState) {
      await startFlow(from);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.AWAITING_NAME) {
      await handleAwaitingName(from, text);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.AWAITING_ADDRESS) {
      await handleAwaitingAddress(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.CONFIRMING_ADDRESS) {
      await handleConfirmingAddress(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.SELECTING_PRODUCT) {
      await handleSelectingProduct(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.AWAITING_QUANTITY) {
      await handleAwaitingQuantity(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.PROVIDING_MENU) {
      await handleProvidingMenu(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.AWAITING_DELIVERY_ADDRESS) {
      await handleAwaitingDeliveryAddress(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    if (currentState === STATE.CONFIRMING_ORDER) {
      await handleConfirmingOrder(from, text, currentMetadata);
      res.sendStatus(200);
      return;
    }

    await whatsappService.sendTextMessage(
      from,
      'Estoy listo para ayudarte. Escribe "hola" para iniciar.'
    );
    res.sendStatus(200);
  } catch (error) {
    console.error('[webhookController.handleWebhook] error:', error.message);
    res.sendStatus(500);
  }
}

module.exports = {
  handleWebhook,
};