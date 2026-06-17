const { CONVERSATION_STATE } = require('./states');
const {
  validateRegistrationName,
  validateRegistrationAddress,
  isMenuAccessAttempt,
  parseProductSelectionId,
  isMenuAccessAllowed,
  validateCartQuantity,
  parseProvidingMenuChoice,
  validateDeliveryAddress,
} = require('./validators');
const { parseClientFoundPayload } = require('../messaging/clientEventSchemas');
const { parseCatalogLoadedPayload, parseProductResolvedPayload } = require('../messaging/catalogEventSchemas');
const { parseCartUpdatedPayload } = require('../messaging/cartEventSchemas');
const {
  formatCatalogMenu,
  formatEmptyCatalogMessage,
  formatCurrency,
} = require('./catalogFormatting');
const {
  formatCartAddedMessage,
  formatCartSummary,
} = require('./cartFormatting');

const MESSAGES = {
  askName:
    'Hola, para registrarte necesito tus datos.\nPor favor envía tu Nombre y Apellidos.',
  askAddress: 'Gracias. Ahora envía tu dirección principal.',
  menuBlocked:
    'Primero debes completar tu identificación antes de ver el menú.',
  confirmAddressPrompt: (name) =>
    `Hola ${name}, te damos la bienvenida de nuevo.\n¿Usarás tu dirección guardada o una nueva?\nResponde: MISMA o NUEVA.`,
  registrationComplete: (name) => `Registro completado, ${name}.`,
  invalidAddressChoice:
    'Responde MISMA para usar tu dirección guardada o NUEVA para indicar otra.',
  addressConfirmedMisma:
    'Perfecto, usaré tu dirección guardada para este pedido.\nEscribe *Ver Menú* para ver los productos disponibles.',
  addressConfirmedNueva:
    'Entendido, indicarás una dirección nueva al confirmar tu pedido.\nEscribe *Ver Menú* para ver los productos disponibles.',
  askDeliveryAddress:
    'Para este pedido necesito la dirección de entrega. Envíala en un solo mensaje.',
  catalogPending:
    'Estamos cargando el menú. Intenta de nuevo en un momento o escribe *Ver Menú*.',
  catalogLoadFailed:
    'No pudimos cargar el menú en este momento. Intenta de nuevo escribiendo *Ver Menú*.',
  invalidProductId:
    'ID de producto inválido. Responde solo con el número del producto del menú.',
  productNotFound:
    'No encontré ese producto. Por favor elige un ID válido del menú.',
  productLookupFailed:
    'No pudimos verificar el producto. Intenta de nuevo en un momento.',
  invalidQuantity:
    'Cantidad inválida. Debe ser un número entero mayor a 0. Ejemplo: 2',
  missingSelectedProduct:
    'Perdí el producto seleccionado. Elige nuevamente un ID del menú.',
  addToCartFailed:
    'No pudimos agregar el producto al carrito. Intenta de nuevo en un momento.',
  emptyCartOnConfirm:
    'Tu carrito está vacío. Primero agrega al menos un producto.',
  invalidProvidingMenuChoice:
    'Responde con una opción válida:\n1. Ver Menú\n2. Confirmar Pedido',
  confirmOrderReady:
    'Perfecto. Continuaremos con la confirmación de tu pedido en el siguiente paso.',
};

function mapClientLookupResponse(response) {
  if (response.type === 'ClientNotFound') {
    return {
      replies: [MESSAGES.askName],
      session: {
        state: CONVERSATION_STATE.AWAITING_REGISTRATION_NAME,
        metadata: {},
      },
    };
  }

  if (response.type === 'ClientFound') {
    const { client } = parseClientFoundPayload(response.payload);

    return {
      replies: [MESSAGES.confirmAddressPrompt(client.nombre)],
      session: {
        state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
        metadata: {
          name: client.nombre,
          savedAddress: client.direccion_principal || '',
        },
      },
    };
  }

  return {
    replies: ['No pudimos verificar tu registro. Intenta de nuevo en un momento.'],
    session: null,
  };
}

function handleRegistrationNameTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return {
      replies: [MESSAGES.menuBlocked],
      session,
    };
  }

  const validation = validateRegistrationName(text);
  if (!validation.valid) {
    return {
      replies: [validation.message],
      session,
    };
  }

  return {
    replies: [MESSAGES.askAddress],
    session: {
      state: CONVERSATION_STATE.AWAITING_REGISTRATION_ADDRESS,
      metadata: {
        ...session.metadata,
        name: validation.value,
      },
    },
  };
}

function handleRegistrationAddressValidation(session, text) {
  if (isMenuAccessAttempt(text)) {
    return {
      replies: [MESSAGES.menuBlocked],
      session,
      shouldRegister: false,
    };
  }

  const validation = validateRegistrationAddress(text);
  if (!validation.valid) {
    return {
      replies: [validation.message],
      session,
      shouldRegister: false,
    };
  }

  return {
    replies: [],
    session,
    shouldRegister: true,
    registrationPayload: {
      nombre: session.metadata.name,
      direccion_principal: validation.value,
    },
  };
}

function mapRegistrationSuccess(client) {
  return {
    replies: [
      MESSAGES.registrationComplete(client.nombre),
      MESSAGES.confirmAddressPrompt(client.nombre),
    ],
    session: {
      state: CONVERSATION_STATE.CONFIRMING_ADDRESS,
      metadata: {
        name: client.nombre,
        savedAddress: client.direccion_principal || '',
      },
    },
  };
}

function handleConfirmingAddressTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    if (!isMenuAccessAllowed(session)) {
      return {
        replies: [MESSAGES.menuBlocked],
        session,
      };
    }

    return buildMenuAccessTransition(session);
  }

  const answer = String(text ?? '').trim().toLowerCase();
  if (answer === 'misma') {
    const savedAddress = session.metadata?.savedAddress || '';

    return {
      replies: [MESSAGES.addressConfirmedMisma],
      session: {
        ...session,
        metadata: {
          ...session.metadata,
          addressConfirmed: true,
          deliveryAddressChoice: 'misma',
          direccionEntrega: savedAddress,
        },
      },
    };
  }

  if (answer === 'nueva') {
    const metadata = { ...session.metadata, addressConfirmed: true, deliveryAddressChoice: 'nueva' };
    delete metadata.direccionEntrega;

    return {
      replies: [MESSAGES.addressConfirmedNueva],
      session: {
        ...session,
        metadata,
      },
    };
  }

  return {
    replies: [MESSAGES.invalidAddressChoice],
    session,
  };
}

function buildMenuAccessTransition(session) {
  const cachedCatalog = session.metadata?.catalogCache;
  if (Array.isArray(cachedCatalog)) {
    return mapCatalogLoadedToTransition(session, cachedCatalog);
  }

  return {
    replies: [],
    session: {
      ...session,
      state: CONVERSATION_STATE.AWAITING_CATALOG,
      metadata: {
        ...session.metadata,
      },
    },
    shouldLoadCatalog: true,
  };
}

function mapCatalogResponse(session, response) {
  if (response.timedOut) {
    return {
      replies: [response.waitingMessage],
      session: {
        ...session,
        state: CONVERSATION_STATE.AWAITING_CATALOG,
        metadata: session.metadata,
      },
    };
  }

  if (response.type === 'CatalogLoadFailed') {
    return {
      replies: [MESSAGES.catalogLoadFailed],
      session: {
        ...session,
        state: CONVERSATION_STATE.AWAITING_CATALOG,
        metadata: session.metadata,
      },
    };
  }

  if (response.type === 'CatalogLoaded') {
    const { products } = parseCatalogLoadedPayload(response.payload);
    return mapCatalogLoadedToTransition(session, products);
  }

  return {
    replies: [MESSAGES.catalogLoadFailed],
    session: {
      ...session,
      state: CONVERSATION_STATE.AWAITING_CATALOG,
      metadata: session.metadata,
    },
  };
}

function mapCatalogLoadedToTransition(session, products) {
  if (!Array.isArray(products) || products.length === 0) {
    return {
      replies: [formatEmptyCatalogMessage()],
      session: {
        ...session,
        state: CONVERSATION_STATE.SELECTING_PRODUCT,
        metadata: {
          ...session.metadata,
          catalogCache: [],
        },
      },
    };
  }

  return {
    replies: [formatCatalogMenu(products)],
    session: {
      ...session,
      state: CONVERSATION_STATE.SELECTING_PRODUCT,
      metadata: {
        ...session.metadata,
        catalogCache: products,
      },
    },
  };
}

function handleAwaitingCatalogTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return buildMenuAccessTransition(session);
  }

  return {
    replies: [MESSAGES.catalogPending],
    session,
    shouldLoadCatalog: true,
  };
}

function handleSelectingProductTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return buildMenuAccessTransition(session);
  }

  const productId = parseProductSelectionId(text);
  if (!productId) {
    return {
      replies: [MESSAGES.invalidProductId],
      session,
      shouldLookupProduct: false,
    };
  }

  return {
    replies: [],
    session,
    shouldLookupProduct: true,
    productId,
  };
}

function mapProductLookupResponse(session, response, productId) {
  if (response.timedOut) {
    return {
      replies: [response.waitingMessage],
      session,
    };
  }

  if (response.type === 'ProductNotFound') {
    return {
      replies: [MESSAGES.productNotFound],
      session,
    };
  }

  if (response.type === 'ProductResolved') {
    const { product } = parseProductResolvedPayload(response.payload);
    return {
      replies: [
        `Producto seleccionado: *${product.nombre}* (${formatCurrency(product.precio)} c/u).`,
        `Indica la cantidad para *${product.nombre}*.`,
      ],
      session: {
        ...session,
        state: CONVERSATION_STATE.AWAITING_QUANTITY,
        metadata: {
          ...session.metadata,
          selectedProduct: product,
        },
      },
    };
  }

  return {
    replies: [MESSAGES.productLookupFailed],
    session,
  };
}

function handleAwaitingQuantityTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return buildMenuAccessTransition(session);
  }

  const validation = validateCartQuantity(text);
  if (!validation.valid) {
    return {
      replies: [validation.message],
      session,
      shouldAddToCart: false,
    };
  }

  const selectedProduct = session.metadata?.selectedProduct;
  if (!selectedProduct?.id) {
    return {
      replies: [MESSAGES.missingSelectedProduct],
      session: {
        ...session,
        state: CONVERSATION_STATE.SELECTING_PRODUCT,
        metadata: {
          ...session.metadata,
          selectedProduct: undefined,
        },
      },
      shouldAddToCart: false,
    };
  }

  return {
    replies: [],
    session,
    shouldAddToCart: true,
    addToCartPayload: {
      productId: selectedProduct.id,
      cantidad: validation.value,
    },
  };
}

function mapAddToCartResponse(session, response, addToCartPayload) {
  if (response.timedOut) {
    return {
      replies: [response.waitingMessage],
      session,
    };
  }

  if (response.type === 'AddToCartFailed') {
    return {
      replies: [MESSAGES.addToCartFailed],
      session,
    };
  }

  if (response.type === 'CartUpdated') {
    const { items, subtotal } = parseCartUpdatedPayload(response.payload);
    const selectedProduct = session.metadata?.selectedProduct;
    const addedItem = items.find((item) => item.productId === addToCartPayload.productId);

    const metadata = { ...session.metadata };
    delete metadata.selectedProduct;

    return {
      replies: [
        formatCartAddedMessage({
          addedItem: addedItem || {
            productId: addToCartPayload.productId,
            cantidad: addToCartPayload.cantidad,
            nombre_producto: selectedProduct?.nombre || 'Producto',
            precio_unitario: selectedProduct?.precio || '0.00',
          },
          items,
          subtotal,
        }),
      ],
      session: {
        ...session,
        state: CONVERSATION_STATE.PROVIDING_MENU,
        metadata,
      },
    };
  }

  return {
    replies: [MESSAGES.addToCartFailed],
    session,
  };
}

function handleProvidingMenuTurn(session, text) {
  if (isMenuAccessAttempt(text)) {
    return buildMenuAccessTransition(session);
  }

  const choice = parseProvidingMenuChoice(text);
  if (!choice) {
    return {
      replies: [MESSAGES.invalidProvidingMenuChoice],
      session,
      shouldGetCart: false,
    };
  }

  if (choice === '1') {
    return buildMenuAccessTransition(session);
  }

  return {
    replies: [],
    session,
    shouldGetCart: true,
    shouldConfirmOrder: true,
  };
}

function formatOrderSummaryMessage({ items, subtotal, direccionEntrega }) {
  return [
    'Resumen de tu pedido:',
    '',
    formatCartSummary(items),
    '',
    `Subtotal: *${formatCurrency(subtotal)}*`,
    `Dirección de entrega: ${direccionEntrega}`,
    '',
    MESSAGES.confirmOrderReady,
  ].join('\n');
}

function needsDeliveryAddressCapture(session) {
  return session.metadata?.deliveryAddressChoice === 'nueva'
    && !session.metadata?.direccionEntrega;
}

function mapGetCartForConfirmResponse(session, response) {
  if (response.timedOut) {
    return {
      replies: [response.waitingMessage],
      session,
    };
  }

  if (response.type === 'CartUpdated') {
    const { items, subtotal } = parseCartUpdatedPayload(response.payload);
    if (!items.length) {
      return {
        replies: [MESSAGES.emptyCartOnConfirm],
        session,
      };
    }

    if (needsDeliveryAddressCapture(session)) {
      return {
        replies: [MESSAGES.askDeliveryAddress],
        session: {
          ...session,
          state: CONVERSATION_STATE.AWAITING_DELIVERY_ADDRESS,
        },
      };
    }

    const direccionEntrega = session.metadata?.direccionEntrega;
    if (!direccionEntrega) {
      return {
        replies: [MESSAGES.addToCartFailed],
        session,
      };
    }

    return {
      replies: [formatOrderSummaryMessage({ items, subtotal, direccionEntrega })],
      session: {
        ...session,
        state: CONVERSATION_STATE.CONFIRMING_ORDER,
      },
    };
  }

  return {
    replies: [MESSAGES.addToCartFailed],
    session,
  };
}

function handleAwaitingDeliveryAddressTurn(session, text) {
  const validation = validateDeliveryAddress(text);
  if (!validation.valid) {
    return {
      replies: [validation.message],
      session,
    };
  }

  return {
    replies: [],
    session: {
      ...session,
      metadata: {
        ...session.metadata,
        direccionEntrega: validation.value,
      },
    },
    shouldGetCartForSummary: true,
  };
}

function mapDeliveryAddressConfirmResponse(session, response) {
  if (response.timedOut) {
    return {
      replies: [response.waitingMessage],
      session,
    };
  }

  if (response.type === 'CartUpdated') {
    const { items, subtotal } = parseCartUpdatedPayload(response.payload);
    if (!items.length) {
      return {
        replies: [MESSAGES.emptyCartOnConfirm],
        session: {
          ...session,
          state: CONVERSATION_STATE.PROVIDING_MENU,
        },
      };
    }

    const direccionEntrega = session.metadata?.direccionEntrega;
    if (!direccionEntrega) {
      return {
        replies: [MESSAGES.askDeliveryAddress],
        session,
      };
    }

    return {
      replies: [formatOrderSummaryMessage({ items, subtotal, direccionEntrega })],
      session: {
        ...session,
        state: CONVERSATION_STATE.CONFIRMING_ORDER,
      },
    };
  }

  return {
    replies: [MESSAGES.addToCartFailed],
    session,
  };
}

module.exports = {
  MESSAGES,
  mapClientLookupResponse,
  handleRegistrationNameTurn,
  handleRegistrationAddressValidation,
  mapRegistrationSuccess,
  handleConfirmingAddressTurn,
  buildMenuAccessTransition,
  mapCatalogResponse,
  mapCatalogLoadedToTransition,
  handleAwaitingCatalogTurn,
  handleSelectingProductTurn,
  mapProductLookupResponse,
  handleAwaitingQuantityTurn,
  mapAddToCartResponse,
  handleProvidingMenuTurn,
  mapGetCartForConfirmResponse,
  handleAwaitingDeliveryAddressTurn,
  mapDeliveryAddressConfirmResponse,
};
