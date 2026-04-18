import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseRouteClient } from '@/lib/supabase/server';

type StoreOrderPayload = {
  buyerName?: string;
  buyerPhone?: string;
  buyerAccountType?: string;
  productId?: string;
  productName?: string;
  productCategory?: string;
  productImage?: string;
  unitPrice?: number;
  quantity?: number;
  paymentMethod?: string;
  paymentProvider?: string;
  paymentType?: string;
  installmentMonths?: number;
  shippingAddress?: string;
  shippingCity?: string;
  shippingCountry?: string;
  notes?: string;
};

export async function GET() {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('store_orders')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Store orders GET failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch store orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseRouteClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as StoreOrderPayload;
    const productId = String(body.productId || '').trim();
    const productName = String(body.productName || '').trim();
    const buyerName =
      String(body.buyerName || '').trim() ||
      String(user.user_metadata?.full_name || user.user_metadata?.name || 'عميل المتجر');

    const quantity = Math.max(1, Number(body.quantity || 1));
    const unitPrice = Math.max(0, Number(body.unitPrice || 0));

    if (!productId || !productName || !buyerName || unitPrice <= 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required order fields' },
        { status: 400 }
      );
    }

    const order = {
      id: crypto.randomUUID(),
      user_id: user.id,
      buyer_name: buyerName,
      buyer_email: user.email || null,
      buyer_phone: body.buyerPhone?.trim() || null,
      buyer_account_type: body.buyerAccountType?.trim() || null,
      product_id: productId,
      product_name: productName,
      product_category: body.productCategory?.trim() || null,
      product_image: body.productImage?.trim() || null,
      unit_price: unitPrice,
      quantity,
      total_price: unitPrice * quantity,
      currency: 'SAR',
      payment_method: body.paymentMethod?.trim() || null,
      payment_provider: body.paymentProvider?.trim() || null,
      payment_type: body.paymentType?.trim() || 'full',
      installment_months:
        body.installmentMonths && Number(body.installmentMonths) > 0
          ? Number(body.installmentMonths)
          : null,
      status: 'pending',
      shipping_address: body.shippingAddress?.trim() || null,
      shipping_city: body.shippingCity?.trim() || null,
      shipping_country: body.shippingCountry?.trim() || 'Saudi Arabia',
      notes: body.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('store_orders')
      .insert(order)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Store order POST failed:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create store order' },
      { status: 500 }
    );
  }
}
