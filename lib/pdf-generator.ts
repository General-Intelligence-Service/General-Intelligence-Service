import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Product } from "@/data/products";
import { siteConfig } from "@/lib/config";

interface OrderItem {
  product: Product;
  quantity: number;
}

export async function generatePDF(orderItems: OrderItem[], config: typeof siteConfig) {
  // إنشاء عنصر HTML مخفي للطلبية
  const tempDiv = document.createElement("div");
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.width = "210mm";
  tempDiv.style.padding = "20mm";
  tempDiv.style.direction = "rtl";
  tempDiv.style.fontFamily = "'Cairo', 'Arial', 'Tahoma', sans-serif";
  tempDiv.style.backgroundColor = "#ffffff";
  tempDiv.style.color = "#000000";

  const date = new Date();
  const dateStr = date.toLocaleDateString("ar-SA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalQuantity = orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const giftTierLabel = (tier: string) => {
    return tier === "luxury" ? "فاخرة" : tier === "premium" ? "مميزة" : "قياسية";
  };

  // إضافة رابط خط Cairo
  const link = document.createElement("link");
  link.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap";
  link.rel = "stylesheet";
  document.head.appendChild(link);

  // انتظار تحميل الخط
  await new Promise((resolve) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        setTimeout(resolve, 500);
      });
    } else {
      setTimeout(resolve, 1000);
    }
  });

  tempDiv.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
      @font-face {
        font-family: 'Cairo';
        font-style: normal;
        font-weight: 400 700;
        font-display: swap;
        src: url('https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hGA-W1ToLQ-HmkA.ttf') format('truetype');
      }
      * { 
        font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif !important; 
        direction: rtl !important;
        unicode-bidi: embed !important;
      }
      body, div, p, h1, h2, h3, th, td, span, table {
        font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif !important;
        direction: rtl !important;
        unicode-bidi: embed !important;
      }
      table {
        direction: rtl !important;
        unicode-bidi: embed !important;
      }
    </style>
    <div style="background: #0b443a; color: white; padding: 25px 20px; text-align: center; margin: -20mm -20mm 20px -20mm; position: relative;">
      <div style="display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap;">
        <img src="/2.png" alt="شعار" style="max-width: 120px; max-height: 60px; object-fit: contain;" />
        <div style="flex: 1; min-width: 200px;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">${config.name}</h1>
          <p style="margin: 8px 0 0 0; font-size: 13px; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #f0f0f0; font-weight: 400;">إدارة التأهيل والتدريب</p>
        </div>
      </div>
      <div style="border-top: 2px solid #baa97c; margin-top: 18px; width: 95%; margin-left: auto; margin-right: auto; box-shadow: 0 1px 2px rgba(186, 169, 124, 0.3);"></div>
    </div>
    
    <div style="margin-bottom: 20px;">
      <p style="font-size: 11px; color: #555; margin: 0 0 12px 0; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; font-weight: 500; direction: rtl; text-align: right;">تاريخ الطلبية: <span style="color: #0b443a; font-weight: 600;">${dateStr}</span></p>
      <h2 style="font-size: 20px; font-weight: 700; color: #0b443a; text-align: center; margin: 15px 0; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl;">طلبية الهدايا</h2>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #0b443a; color: white;">
          <th style="padding: 14px 10px; text-align: center; border: 1px solid #0a3a32; font-size: 12px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; unicode-bidi: bidi-override;">#</th>
          <th style="padding: 14px 10px; text-align: right; border: 1px solid #0a3a32; font-size: 12px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; unicode-bidi: bidi-override;">اسم المنتج</th>
          <th style="padding: 14px 10px; text-align: center; border: 1px solid #0a3a32; font-size: 12px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; unicode-bidi: bidi-override;">الكود</th>
          <th style="padding: 14px 10px; text-align: center; border: 1px solid #0a3a32; font-size: 12px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; unicode-bidi: bidi-override;">التصنيف</th>
          <th style="padding: 14px 10px; text-align: center; border: 1px solid #0a3a32; font-size: 12px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; direction: rtl; unicode-bidi: bidi-override;">الكمية</th>
        </tr>
      </thead>
      <tbody>
        ${orderItems
          .map(
            (item, index) => `
          <tr style="background: ${index % 2 === 0 ? "#ffffff" : "#f8f9fa"};">
            <td style="padding: 12px 10px; text-align: center; border: 1px solid #e0e0e0; font-size: 11px; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #333; font-weight: 500; direction: rtl; unicode-bidi: bidi-override;">${index + 1}</td>
            <td style="padding: 12px 10px; text-align: right; border: 1px solid #e0e0e0; font-size: 11px; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #2c2c2c; font-weight: 500; direction: rtl; unicode-bidi: bidi-override;">${item.product.name}</td>
            <td style="padding: 12px 10px; text-align: center; border: 1px solid #e0e0e0; font-size: 11px; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #0b443a; font-weight: 600; direction: rtl; unicode-bidi: bidi-override;">${item.product.sku}</td>
            <td style="padding: 12px 10px; text-align: center; border: 1px solid #e0e0e0; font-size: 11px; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #555; font-weight: 500; direction: rtl; unicode-bidi: bidi-override;">${giftTierLabel(item.product.giftTier)}</td>
            <td style="padding: 12px 10px; text-align: center; border: 1px solid #e0e0e0; font-size: 11px; font-weight: 700; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; color: #0b443a; background: ${index % 2 === 0 ? "#f0f7f5" : "#ffffff"}; direction: rtl; unicode-bidi: bidi-override;">${item.quantity}</td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>

    <div style="margin-top: 30px; padding: 18px; border-top: 3px solid #0b443a; border-bottom: 2px solid #baa97c; background: #f8faf9; border-radius: 4px;">
      <p style="font-size: 15px; font-weight: 700; color: #0b443a; margin: 0; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; text-align: right; direction: rtl;">
        إجمالي القطع: <span style="font-size: 18px; color: #0b443a; background: #e8f3f0; padding: 4px 12px; border-radius: 4px; display: inline-block; margin-right: 8px;">${totalQuantity}</span>
      </p>
    </div>

    <div style="margin-top: 35px; text-align: center; font-size: 10px; color: #999; padding-top: 18px; border-top: 1px solid #e5e5e5; font-family: 'Cairo', 'Arial', 'Tahoma', sans-serif; font-weight: 400; direction: rtl;">
      تم إنشاء هذه الطلبية من ${config.name}
    </div>
  `;

  document.body.appendChild(tempDiv);

  try {
    // انتظار تحميل الصور (الشعار)
    await new Promise((resolve) => {
      const images = tempDiv.getElementsByTagName("img");
      let loadedCount = 0;
      const totalImages = images.length;
      
      if (totalImages === 0) {
        setTimeout(resolve, 100);
        return;
      }
      
      Array.from(images).forEach((img) => {
        if (img.complete) {
          loadedCount++;
          if (loadedCount === totalImages) setTimeout(resolve, 100);
        } else {
          img.onload = () => {
            loadedCount++;
            if (loadedCount === totalImages) setTimeout(resolve, 100);
          };
          img.onerror = () => {
            loadedCount++;
            if (loadedCount === totalImages) setTimeout(resolve, 100);
          };
        }
      });
    });

    // تحويل HTML إلى صورة بدقة عالية جداً
    const canvas = await html2canvas(tempDiv, {
      scale: 5, // زيادة الدقة إلى 5x للحصول على جودة ممتازة
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      allowTaint: true,
      windowWidth: tempDiv.scrollWidth,
      windowHeight: tempDiv.scrollHeight,
      width: tempDiv.offsetWidth,
      height: tempDiv.offsetHeight,
      onclone: (clonedDoc) => {
        // التأكد من تحميل الخط في المستند المستنسخ
        const clonedDiv = clonedDoc.querySelector('div[style*="210mm"]') as HTMLElement;
        if (clonedDiv) {
          clonedDiv.style.fontFamily = "'Cairo', 'Arial', 'Tahoma', sans-serif";
          clonedDiv.style.direction = "rtl";
          // تحسين جودة الخط في المستند المستنسخ
          (clonedDiv.style as any).webkitFontSmoothing = "antialiased";
          (clonedDiv.style as any).mozOsxFontSmoothing = "grayscale";
          (clonedDiv.style as any).textRendering = "optimizeLegibility";
        }
      },
    });

    // إنشاء PDF من الصورة بدقة عالية جداً
    const imgData = canvas.toDataURL("image/jpeg", 0.98); // استخدام JPEG بجودة 98% (أفضل من PNG للصور الكبيرة)
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: false, // تعطيل الضغط للحفاظ على الجودة القصوى
      precision: 16, // دقة عالية في الحسابات
    });

    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    // استخدام SLOW للحصول على أفضل جودة
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "SLOW");
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "SLOW");
      heightLeft -= pageHeight;
    }

    // حفظ الملف
    const fileName = `طلبية-هدايا-${date.toISOString().split("T")[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    alert("حدث خطأ أثناء إنشاء ملف PDF");
  } finally {
    // إزالة العنصر المؤقت
    document.body.removeChild(tempDiv);
  }
}

