import { z, ZodError } from "zod";

export function buildErrorObject(node) {
  const result = {};

  for (const key of Object.keys(node)) {
    const current = node[key];

    // Nested object
    if (current?.properties) {
      const nested = buildErrorObject(current.properties);
      if (Object.keys(nested).length > 0) {
        result[key] = nested;
      }
      continue;
    }

    if (current?.items && Array.isArray(current.items)) {
      result[key] = current.items.map((item) => {
        return item.errors.join(",");
      });
      continue;
    }
    // Leaf error
    const message = current?.errors?.[0];
    if (message) {
      result[key] = message;
    }
  }

  return result;
}

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (parsed.body) {
        req.body = parsed.body;
      }

      if (parsed.query) {
        Object.assign(req.query, parsed.query);
      }

      if (parsed.params) {
        Object.assign(req.params, parsed.params);
      }

      return next();
    } catch (err) {
      if (!(err instanceof ZodError)) {
        return next(err);
      }

      const tree = z.treeifyError(err);

      const fields = {};

      if (tree.properties?.body?.properties) {
        const bodyErrors = buildErrorObject(tree.properties.body.properties);
        if (Object.keys(bodyErrors).length > 0) {
          fields.body = bodyErrors;
        }
      }

      if (tree.properties?.params?.properties) {
        const paramErrors = buildErrorObject(tree.properties.params.properties);
        if (Object.keys(paramErrors).length > 0) {
          fields.params = paramErrors;
        }
      }

      if (tree.properties?.query?.properties) {
        const queryErrors = buildErrorObject(tree.properties.query.properties);
        if (Object.keys(queryErrors).length > 0) {
          fields.query = queryErrors;
        }
      }

      return res.status(400).json({
        success: false,
        error: {
          type: "VALIDATION_ERROR",
          message: "Invalid request data",
          fields,
        },
      });
    }
  };
}
