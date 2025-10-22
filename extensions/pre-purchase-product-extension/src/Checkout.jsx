import "@shopify/ui-extensions/preact";
import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

export default function () {
  render(<Extension />, document.body);
}

function Extension() {
  const { applyCartLinesChange, query, i18n, lines } = shopify;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (showError) {
      const timer = setTimeout(() => setShowError(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showError]);

  async function fetchProducts() {
  setLoading(true);
  try {
    const { data } = await query(
      `
      query ($first: Int!) {
        products(first: $first) {
          nodes {
            id
            title
            handle
            description
            images(first: 1) {
              nodes {
                url
              }
            }
            variants(first: 1) {
              nodes {
                id
                price {
                  amount
                }
              }
            }
          }
        }
      }
      `,
      { variables: { first: 20 } } // small number is fine
    );

    // ✅ Replace this with your desired product handle or ID
    const targetHandle = "shipping-insurance"; 

    const targetProduct = data.products.nodes.find(
      (p) => p.handle === targetHandle
    );

    if (targetProduct) {
      setProducts([targetProduct]);
    } else {
      setProducts([]);
    }
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
}

  async function handleAddToCart(variantId) {
    setProcessing(true);
    const result = await applyCartLinesChange({
      type: "addCartLine",
      merchandiseId: variantId,
      quantity: 1,
    });
    setProcessing(false);
    if (result.type === "error") {
      setShowError(true);
      console.error(result.message);
    }
  }

  async function handleRemoveFromCart(variantId) {
    const lineToRemove = lines.value.find(
      (item) => item.merchandise.id === variantId
    );
    if (!lineToRemove) return;

    setProcessing(true);
    const result = await applyCartLinesChange({
      type: "removeCartLine",
      id: lineToRemove.id,
      quantity: lineToRemove.quantity,
    });
    setProcessing(false);
    if (result.type === "error") {
      setShowError(true);
      console.error(result.message);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  const suggestedProduct = getFirstSuggestedProduct(lines.value, products);
  if (!suggestedProduct) return null;

  const variantId = suggestedProduct.variants.nodes[0].id;
  const isInCart = lines.value.some((line) => line.merchandise.id === variantId);

  return (
    <ProductOffer
      product={suggestedProduct}
      i18n={i18n}
      processing={processing}
      showError={showError}
      isInCart={isInCart}
      onAdd={() => handleAddToCart(variantId)}
      onRemove={() => handleRemoveFromCart(variantId)}
    />
  );
}

function LoadingSkeleton() {
  return (
    <s-stack gap="large-200">
      <s-divider />
      <s-heading>You might also like</s-heading>
      <s-stack gap="base">
        <s-grid
          gap="base"
          gridTemplateColumns="64px 1fr auto"
          alignItems="center"
        >
          <s-image loading="lazy" />
          <s-stack gap="none">
            <s-skeleton-paragraph />
            <s-skeleton-paragraph />
          </s-stack>
          <s-button variant="secondary" disabled>
            Add
          </s-button>
        </s-grid>
      </s-stack>
    </s-stack>
  );
}

function getFirstSuggestedProduct(lines, products) {
  // Always show the first product (your specific one)
  return products[0] || null;
}


// function ProductOffer({
//   product,
//   i18n,
//   processing,
//   showError,
//   isInCart,
//   onAdd,
//   onRemove,
// }) {
//   const { images, title, variants } = product;
//   const price = i18n.formatCurrency(variants.nodes[0].price.amount);
//   const imageUrl =
//     images.nodes[0]?.url ??
//     "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081";

//   return (
//     <s-stack gap="large-200">
//       <s-divider />
//       <s-heading>You might also like</s-heading>
//       <s-grid
//         gap="base"
//         gridTemplateColumns="64px 1fr auto"
//         alignItems="center"
//       >
//         <s-image
//           borderWidth="base"
//           borderRadius="large-100"
//           src={imageUrl}
//           alt={title}
//           aspectRatio="1"
//         />
//         <s-stack gap="none">
//           <s-text type="strong">{title}</s-text>
//           <s-text color="subdued">{price}</s-text>
//         </s-stack>
//         <s-button
//           variant={isInCart ? "primary" : "secondary"}
//           tone={isInCart ? "critical" : "default"}
//           loading={processing}
//           onClick={isInCart ? onRemove : onAdd}
//         >
//           {isInCart ? "Remove" : "Add"}
//         </s-button>
//       </s-grid>

//       {showError && <ErrorBanner />}
//     </s-stack>
//   );
// }

function ProductOffer({
  product,
  i18n,
  processing,
  showError,
  isInCart,
  onAdd,
  onRemove,
}) {
  if (!product) return null; // safety check

  const { images, title, description, variants } = product;
  const price = i18n.formatCurrency(variants.nodes[0].price.amount);
  const imageUrl =
    images?.nodes?.[0]?.url ??
    "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_medium.png?format=webp&v=1530129081";

  function handleToggle(e) {
    const checked = e.target.checked;
    if (checked) onAdd();
    else onRemove();
  }

  return (
    <s-stack gap="large-200" padding="base">
      <s-divider />
      {/* Heading */}
      <s-grid 
        gap="base"
        gridTemplateColumns="1fr auto"
        alignItems="start">
        <s-text type="strong">
          Add Insurance to your order? Just {price} extra!
        </s-text>
        <s-checkbox
          checked={isInCart}
          onChange={handleToggle}
          disabled={processing}
        />
      </s-grid>

      {/* Product details */}
      <s-grid
        gap="base"
        gridTemplateColumns="50px 1fr"
        alignItems="start"
      >
        <s-image
          src={imageUrl}
          aspectRatio="1"
          borderRadius="small-100"
          alt={title}
        />
        <s-stack gap="extra-tight">
          <s-text type="strong">{title}</s-text>
          <s-text size="small">{description}</s-text>
        </s-stack>
      </s-grid>

      {showError && <ErrorBanner />}
    </s-stack>
  );
}


function ErrorBanner() {
  return (
    <s-banner tone="critical">
      There was an issue updating your cart. Please try again.
    </s-banner>
  );
}
