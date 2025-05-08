"""
Utilities for PDF generation for finance documents such as invoices.
"""

import os
import io
from datetime import datetime
from xhtml2pdf import pisa
from django.template.loader import get_template
from django.http import HttpResponse
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def render_to_pdf(template_src, context_dict={}):
    """
    Renders a HTML template to a PDF file
    """
    template = get_template(template_src)
    html = template.render(context_dict)
    result = io.BytesIO()
    
    # Create PDF
    pdf = pisa.pisaDocument(io.BytesIO(html.encode('UTF-8')), result)
    
    if not pdf.err:
        return result.getvalue()
    
    logger.error(f"Error generating PDF: {pdf.err}")
    return None

def generate_invoice_pdf(invoice):
    """
    Generate a PDF for an invoice
    """
    # Format data for the template
    context = {
        'invoice': invoice,
        'company': invoice.insurance_company,
        'invoice_items': invoice.items.all(),
        'generation_date': datetime.now().strftime("%d %b, %Y"),
        'logo_path': os.path.join(settings.STATIC_ROOT, 'img/logo.png') if os.path.exists(os.path.join(settings.STATIC_ROOT, 'img/logo.png')) else None,
    }
    
    # Calculate some additional information
    total_amount = float(invoice.total_amount)
    vat_rate = 0.20  # 20% VAT
    vat_amount = total_amount * vat_rate
    net_amount = total_amount - vat_amount
    
    context.update({
        'net_amount': f"{net_amount:.2f}",
        'vat_amount': f"{vat_amount:.2f}",
        'total_amount': f"{total_amount:.2f}",
        'vat_rate': f"{vat_rate*100:.0f}%",
    })
    
    # Render the invoice template to PDF
    pdf_content = render_to_pdf('finance/invoice_template.html', context)
    
    return pdf_content

def pdf_response(pdf_content, filename):
    """
    Create a HTTP response with PDF content
    """
    response = HttpResponse(pdf_content, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response