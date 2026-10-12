
/*
 * Jabón SAP — Sistema de ventas
 * Archivo: tienda.js
 *
 * Incluye:
 * - Agregar productos al carrito.
 * - Aumentar y reducir cantidades.
 * - Eliminar productos.
 * - Calcular subtotales.
 * - Registrar pedidos localmente.
 * - Mostrar confirmación de compra.
 *
 * Importante:
 * Los pedidos se guardan en el navegador.
 * No procesa pagos reales ni envía pedidos a Firebase.
 */

(() => {
  'use strict';

  const CART_KEY = 'jabonSAP_carrito_v1';
  const ORDERS_KEY = 'jabonSAPPedidos';

  let cart = loadCart();

  // Formato de moneda mexicana
  function money(amount) {
    return Number(amount || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });
  }

  // Recuperar carrito guardado
  function loadCart() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(CART_KEY) || '{}'
      );

      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) {
        return {};
      }

      return Object.fromEntries(
        Object.entries(saved).filter(([, item]) =>
          item &&
          typeof item.name === 'string' &&
          Number.isFinite(Number(item.price)) &&
          Number(item.price) > 0 &&
          Number.isInteger(Number(item.quantity)) &&
          Number(item.quantity) > 0
        ).map(([key, item]) => [
          key,
          {
            name: item.name,
            price: Number(item.price),
            quantity: Number(item.quantity)
          }
        ])
      );
    } catch (error) {
      console.error('Error al recuperar el carrito:', error);
      return {};
    }
  }

  // Guardar carrito
  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('No se pudo guardar el carrito:', error);
    }
  }

  function getItems() {
    return Object.values(cart);
  }

  function getSubtotal() {
    return getItems().reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  function setText(id, text) {
    const element = document.getElementById(id);

    if (element) {
      element.textContent = text;
    }
  }

  // Mostrar una sección
  function showSection(id) {
    const sections = [
      'carrito',
      'checkout',
      'order-confirmation'
    ];

    sections.forEach(sectionId => {
      const section = document.getElementById(sectionId);

      if (section) {
        section.hidden = sectionId !== id;
      }
    });

    const target = document.getElementById(id);

    if (target) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Agregar un producto al carrito
  function addToCart(button) {
    const card = button?.closest('.product-card');

    if (!card) {
      console.error(
        'No se encontró el contenedor .product-card.'
      );
      return;
    }

    const nameElement = card.querySelector('.product-name');
    const priceElement = card.querySelector('.product-price');

    const name = nameElement?.textContent.trim() || '';
    const priceText = priceElement?.textContent || '';

    const match = priceText
      .replace(/,/g, '')
      .match(/\d+(?:\.\d{1,2})?/);

    const price = match ? Number(match[0]) : NaN;

    if (!name || !Number.isFinite(price) || price <= 0) {
      alert('No se pudo identificar el nombre o precio del producto.');
      return;
    }

    if (cart[name]) {
      cart[name].quantity++;
    } else {
      cart[name] = {
        name,
        price,
        quantity: 1
      };
    }

    saveCart();
    renderCart();

    const toast = document.getElementById('toast');

    if (toast) {
      toast.textContent = '✓ Producto agregado al carrito';
      toast.style.display = 'block';

      window.setTimeout(() => {
        toast.style.display = 'none';
      }, 2200);
    }

    showSection('carrito');
  }

  // Cambiar cantidad
  function changeQuantity(name, delta) {
    if (!cart[name]) return;

    cart[name].quantity += delta;

    if (cart[name].quantity <= 0) {
      delete cart[name];
    }

    saveCart();
    renderCart();
  }

  // Eliminar producto
  function removeFromCart(name) {
    delete cart[name];

    saveCart();
    renderCart();
  }

  // Crear botones del carrito
  function makeButton(label, accessibleLabel, callback) {
    const button = document.createElement('button');

    button.type = 'button';
    button.textContent = label;
    button.setAttribute('aria-label', accessibleLabel);

    button.addEventListener('click', callback);

    return button;
  }

  // Dibujar carrito y calcular totales
  function renderCart() {
    const container = document.getElementById('cart-items');

    if (container) {
      container.replaceChildren();

      const items = getItems();

      if (items.length === 0) {
        const empty = document.createElement('p');

        empty.textContent =
          'Tu carrito está vacío. Agrega algún producto para continuar.';

        container.appendChild(empty);
      } else {
        items.forEach(item => {
          const row = document.createElement('div');
          row.className = 'cart-row';

          const details = document.createElement('div');

          const title = document.createElement('h3');
          title.textContent = item.name;

          const unitPrice = document.createElement('p');
          unitPrice.textContent =
            `${money(item.price)} por unidad`;

          const quantity = document.createElement('p');
          quantity.textContent =
            `Cantidad: ${item.quantity}`;

          const lineTotal = document.createElement('p');
          lineTotal.textContent =
            `Importe: ${money(item.price * item.quantity)}`;

          details.append(
            title,
            unitPrice,
            quantity,
            lineTotal
          );

          const controls = document.createElement('div');

          controls.append(
            makeButton(
              '−',
              `Reducir cantidad de ${item.name}`,
              () => changeQuantity(item.name, -1)
            ),
            makeButton(
              '+',
              `Aumentar cantidad de ${item.name}`,
              () => changeQuantity(item.name, 1)
            ),
            makeButton(
              'Eliminar',
              `Eliminar ${item.name}`,
              () => removeFromCart(item.name)
            )
          );

          row.append(details, controls);
          container.appendChild(row);
        });
      }
    }

    const subtotal = getSubtotal();

    setText('cart-subtotal', money(subtotal));
    setText(
      'cart-total',
      `${money(subtotal)} + envío por definir`
    );
    setText(
      'checkout-total',
      `Subtotal de productos: ${money(subtotal)}. El costo de envío se confirmará por separado.`
    );

    const checkoutButton = document.querySelector(
      '.cart-summary button[onclick="goToCheckout()"]'
    );

    if (checkoutButton) {
      checkoutButton.disabled = getItems().length === 0;
    }

    // Actualizar contador del carrito si existe en el HTML
    const count = getItems().reduce(
      (total, item) => total + item.quantity,
      0
    );

    setText('cart-count', count);
  }

  // Ir al formulario de compra
  function goToCheckout() {
    if (getItems().length === 0) {
      alert('Agrega al menos un producto para continuar.');
      return;
    }

    showSection('checkout');
  }

  // Cerrar carrito y volver a productos
  function closeCart() {
    const section = document.getElementById('carrito');

    if (section) {
      section.hidden = true;
    }

    const products = document.getElementById('productos');

    if (products) {
      products.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Volver al carrito desde el formulario
  function backToCart() {
    showSection('carrito');
  }

  // Recuperar historial de pedidos
  function getOrderHistory() {
    try {
      const history = JSON.parse(
        localStorage.getItem(ORDERS_KEY) || '[]'
      );

      return Array.isArray(history) ? history : [];
    } catch (error) {
      console.error('No se pudo leer el historial:', error);
      return [];
    }
  }

  // Guardar pedido localmente
  function saveOrderLocally(order) {
    try {
      const history = getOrderHistory();

      history.push(order);

      localStorage.setItem(
        ORDERS_KEY,
        JSON.stringify(history)
      );

      return true;
    } catch (error) {
      console.error('No se pudo guardar el pedido:', error);
      return false;
    }
  }

  // Mostrar confirmación
  function renderConfirmation(order) {
    const details = document.getElementById(
      'confirmation-details'
    );

    if (!details) return;

    details.replaceChildren();

    function addParagraph(text) {
      const p = document.createElement('p');
      p.textContent = text;
      details.appendChild(p);
    }

    addParagraph(`Referencia del pedido: ${order.referencia}`);
    addParagraph(`Fecha: ${order.fecha}`);
    addParagraph(`Cliente: ${order.cliente.nombre}`);
    addParagraph(`Teléfono: ${order.cliente.telefono}`);
    addParagraph(`Correo: ${order.cliente.correo}`);

    addParagraph(
      `Dirección de entrega: ${order.cliente.direccion}, ` +
      `${order.cliente.colonia}, ${order.cliente.ciudad}, ` +
      `CP ${order.cliente.cp}`
    );

    const heading = document.createElement('h3');
    heading.textContent = 'Productos solicitados';

    details.appendChild(heading);

    order.productos.forEach(item => {
      addParagraph(
        `${item.name} × ${item.quantity}: ` +
        `${money(item.price * item.quantity)}`
      );
    });

    addParagraph(
      `Subtotal de productos: ${money(order.subtotal)}`
    );

    addParagraph('Envío: pendiente de confirmar.');

    addParagraph(
      `Método de pago elegido: ${order.cliente.pago || 'Por definir'}`
    );

    addParagraph(
      'Estado: pedido registrado en este navegador; pago y entrega pendientes de confirmar.'
    );

    addParagraph(
      'Esta confirmación no significa que se haya realizado un cobro.'
    );
  }

  // Procesar formulario de compra
  function handleCheckoutSubmit(event) {
    event.preventDefault();

    if (getItems().length === 0) {
      alert('Tu carrito está vacío.');
      showSection('carrito');
      return;
    }

    const form = event.currentTarget;

    if (!form.reportValidity()) {
      return;
    }

    const formData = new FormData(form);
    const customer = Object.fromEntries(formData.entries());

    const order = {
      referencia: `SAP-${Date.now().toString().slice(-8)}`,
      cliente: customer,
      productos: getItems().map(item => ({ ...item })),
      subtotal: getSubtotal(),
      fecha: new Date().toLocaleString('es-MX')
    };

    const saved = saveOrderLocally(order);

    renderConfirmation(order);

    // Vaciar carrito después de registrar el pedido
    cart = {};

    saveCart();
    renderCart();
    form.reset();

    showSection('order-confirmation');

    if (!saved) {
      alert(
        'El pedido se mostró en pantalla, pero no pudo guardarse en el navegador.'
      );
    }
  }

  // Volver a los productos después de confirmar
  function returnToProducts() {
    const confirmation = document.getElementById(
      'order-confirmation'
    );

    if (confirmation) {
      confirmation.hidden = true;
    }

    const products = document.getElementById('productos');

    if (products) {
      products.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  // Inicializar el sistema de ventas
  function init() {
    // Hacer accesibles las funciones para los botones del HTML
    window.addToCart = addToCart;
    window.showSection = showSection;
    window.goToCheckout = goToCheckout;
    window.closeCart = closeCart;
    window.backToCart = backToCart;
    window.returnToProducts = returnToProducts;

    // Enlaces para abrir el carrito
    document.querySelectorAll('a[href="#carrito"]').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        showSection('carrito');
      });
    });

    // Formulario de compra
    const form = document.getElementById('checkout-form');

    if (form) {
      form.addEventListener('submit', handleCheckoutSubmit);
    }

    renderCart();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {
      once: true
    });
  } else {
    init();
  }
})();
