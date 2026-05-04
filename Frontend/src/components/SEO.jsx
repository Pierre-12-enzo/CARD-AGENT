// src/components/SEO.jsx
import { Helmet } from 'react-helmet-async';

const SEO = ({ 
  title = 'CAPMIS - School Management System',
  description = 'Complete school management system for Rwandan schools. Student management, permission slips, ID cards, analytics.',
  keywords = 'school management, Rwanda, student management, permission slips, ID cards, education software',
  url = 'https://cap-mis.ilelio.rw',
  image = 'https://cap-mis.ilelio.rw/og-image.png',
  type = 'website'
}) => {
  return (
    <Helmet>
      {/* Basic */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      
      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
      
      {/* Additional */}
      <meta name="robots" content="index, follow" />
      <meta name="language" content="English" />
      <meta name="author" content="CAPMIS Team" />
      <meta name="geo.region" content="RW" />
      <meta name="geo.placename" content="Rwanda" />
      <meta name="geo.position" content="-1.9403;29.8739" />
      <meta name="ICBM" content="-1.9403, 29.8739" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "CAPMIS School Management System",
          "description": description,
          "url": url,
          "applicationCategory": "BusinessApplication",
          "operatingSystem": "Web",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          },
          "author": {
            "@type": "Organization",
            "name": "CAPMIS",
            "url": "https://cap-mis.ilelio.rw"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO;