import { mockMetrics, mockSalesData } from '@/src/lib/mock-admin';
import { getProducts } from '@/src/lib/product-data';

export async function getFallbackAnswer(prompt: string): Promise<string> {
    const q = prompt.toLowerCase();

    if (q.includes('revenue') || q.includes('sales')) {
        return `Revenue over the last 7 days was $${mockMetrics.revenue.toFixed(2)}, across ${mockMetrics.ordersCount} orders — a ${mockMetrics.conversionRate}% conversion rate.`;
    }

    if (q.includes('forecast') || q.includes('predict')) {
        const next = mockSalesData.find((d) => d.predicted !== null && d.actual === null);
        return next
            ? `The forecast for ${next.date} is $${next.predicted}.`
            : "I don't have a forecast for that period yet.";
    }

    if (q.includes('top product') || q.includes('best seller') || q.includes('best-selling')) {
        const products = await getProducts();
        const top = [...products].sort((a, b) => b.price * b.stock - a.price * a.stock)[0];
        return top
            ? `Based on stock value, "${top.name}" (${top.category}) looks like your top product at $${top.price.toFixed(2)}.`
            : "You don't have any products yet — add some from the Products tab.";
    }

    if (q.includes('customer') || q.includes('client')) {
        return `You've gained ${mockMetrics.newCustomers} new customers in the last 7 days.`;
    }

    if (q.includes('stock') || q.includes('inventory') || q.includes('out of stock')) {
        const products = await getProducts();
        const low = products.filter((p) => p.stock <= 5);
        return low.length > 0
            ? `Low on stock: ${low.map((p) => `${p.name} (${p.stock} left)`).join(', ')}.`
            : 'All products are well stocked right now.';
    }

    return "I'm running in offline demo mode (no AI backend connected), but I can answer questions about revenue, forecasts, top products, customers, and stock levels — try asking about one of those.";
}
