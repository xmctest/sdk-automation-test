import { useEffect, JSX } from 'react';
import { GetServerSideProps } from 'next';
import NotFound from 'src/NotFound';
import Layout from 'src/Layout';
import { SitecorePageProps, getSiteRewriteData } from '@sitecore-content-sdk/nextjs';
import { extractPath, handleEditorFastRefresh } from '@sitecore-content-sdk/nextjs/utils';
import { isDesignLibraryPreviewData } from '@sitecore-content-sdk/nextjs/editing';
import components from '.sitecore/component-map';
import client from 'lib/sitecore-client';
import Providers from 'src/Providers';

const SitecorePage = ({ page, notFound, componentProps }: SitecorePageProps): JSX.Element => {
  useEffect(() => {
    // Since Sitecore Editor does not support Fast Refresh, need to refresh editor chromes after Fast Refresh finished
    handleEditorFastRefresh();
  }, []);

  if (notFound || !page) {
    // Shouldn't hit this (as long as 'notFound' is being returned below), but just to be safe
    return <NotFound />;
  }

  return (
    <>
      <h2>SSR BASED PAGE</h2>
      <Providers componentProps={componentProps} page={page}>
        <Layout page={page} />
      </Providers>
    </>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  let props = {};
  const path = extractPath(context);
  let page;

  console.log('GET SERVER SIDE PROPS CALLED');

  const authToken = context.req.headers.authorization || '';

  console.log('AUTH TOKEN:', authToken);

  if (context.preview && isDesignLibraryPreviewData(context.previewData)) {
    page = await client.getDesignLibraryData(context.previewData);
  } else {
    page = context.preview
      ? await client.getPreview(context.previewData, {
          headers: {
            Authorization: authToken,
          },
        })
      : await client.getPage(
          path,
          { locale: context.locale },
          {
            headers: {
              // Pass the JWT token and sc_previewMode, sc_site headers
              Authorization: authToken,
              sc_previewMode: 'true',
              sc_site: getSiteRewriteData(path, '').siteName,
            },
          }
        );
  }
  if (page) {
    props = {
      page,
      dictionary: await client.getDictionary({
        site: page.siteName,
        locale: page.locale,
      }),
      componentProps: await client.getComponentData(page.layout, context, components),
    };
  }
  return {
    props,
    notFound: !page,
  };
};

export default SitecorePage;
