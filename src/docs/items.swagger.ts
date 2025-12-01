/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Item ID
 *           example: 1
 *         name:
 *           type: string
 *           description: Item name
 *           example: Product A
 *         code:
 *           type: string
 *           nullable: true
 *           description: Item code
 *           example: PROD-001
 *         sku:
 *           type: string
 *           nullable: true
 *           description: Stock Keeping Unit
 *           example: SKU-12345
 *         description:
 *           type: string
 *           nullable: true
 *           description: Item description
 *           example: A high-quality product
 *         price:
 *           type: string
 *           description: Item price
 *           example: "99.99"
 *         cost:
 *           type: string
 *           description: Item cost
 *           example: "50.00"
 *         weight:
 *           type: string
 *           description: Item weight
 *           example: "1.5"
 *         space_id:
 *           type: integer
 *           nullable: true
 *           description: Space ID the item belongs to
 *           example: 1
 *         space_type:
 *           type: string
 *           nullable: true
 *           description: Type of space
 *           example: warehouse
 *         status:
 *           type: string
 *           enum: [active, inactive, archived]
 *           description: Item status
 *           example: active
 *         notes:
 *           type: string
 *           nullable: true
 *           description: Additional notes
 *         images:
 *           type: object
 *           nullable: true
 *           description: Item images
 *         attributes:
 *           type: object
 *           nullable: true
 *           description: Custom attributes
 *         dimension:
 *           type: object
 *           nullable: true
 *           description: Item dimensions
 *         files:
 *           type: object
 *           nullable: true
 *           description: Associated files
 *         links:
 *           type: object
 *           nullable: true
 *           description: Related links
 *         options:
 *           type: object
 *           nullable: true
 *           description: Item options
 *         tags:
 *           type: object
 *           nullable: true
 *           description: Item tags
 *         variants:
 *           type: object
 *           nullable: true
 *           description: Item variants
 *         primary_code:
 *           type: string
 *           nullable: true
 *           description: Primary code
 *         model_id:
 *           type: integer
 *           nullable: true
 *         model_type:
 *           type: string
 *           nullable: true
 *         parent_id:
 *           type: integer
 *           nullable: true
 *         parent_type:
 *           type: string
 *           nullable: true
 *         type_id:
 *           type: integer
 *           nullable: true
 *         type_type:
 *           type: string
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     CreateItemRequest:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: Item name (required)
 *           example: Product A
 *         code:
 *           type: string
 *           nullable: true
 *           example: PROD-001
 *         sku:
 *           type: string
 *           nullable: true
 *           example: SKU-12345
 *         description:
 *           type: string
 *           nullable: true
 *         price:
 *           type: string
 *           example: "99.99"
 *         cost:
 *           type: string
 *           example: "50.00"
 *         weight:
 *           type: string
 *           example: "1.5"
 *         space_id:
 *           type: integer
 *           nullable: true
 *         space_type:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, inactive, archived]
 *           default: active
 *         notes:
 *           type: string
 *           nullable: true
 *         images:
 *           type: object
 *           nullable: true
 *         attributes:
 *           type: object
 *           nullable: true
 *         dimension:
 *           type: object
 *           nullable: true
 *         files:
 *           type: object
 *           nullable: true
 *         links:
 *           type: object
 *           nullable: true
 *         options:
 *           type: object
 *           nullable: true
 *         tags:
 *           type: object
 *           nullable: true
 *         variants:
 *           type: object
 *           nullable: true
 *         primary_code:
 *           type: string
 *           nullable: true
 *         model_id:
 *           type: integer
 *           nullable: true
 *         model_type:
 *           type: string
 *           nullable: true
 *         parent_id:
 *           type: integer
 *           nullable: true
 *         parent_type:
 *           type: string
 *           nullable: true
 *         type_id:
 *           type: integer
 *           nullable: true
 *         type_type:
 *           type: string
 *           nullable: true
 *
 *     UpdateItemRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Updated Product Name
 *         code:
 *           type: string
 *           nullable: true
 *         sku:
 *           type: string
 *           nullable: true
 *         description:
 *           type: string
 *           nullable: true
 *         price:
 *           type: string
 *         cost:
 *           type: string
 *         weight:
 *           type: string
 *         space_id:
 *           type: integer
 *           nullable: true
 *         space_type:
 *           type: string
 *           nullable: true
 *         status:
 *           type: string
 *           enum: [active, inactive, archived]
 *         notes:
 *           type: string
 *           nullable: true
 *         images:
 *           type: object
 *           nullable: true
 *         attributes:
 *           type: object
 *           nullable: true
 *         dimension:
 *           type: object
 *           nullable: true
 *         files:
 *           type: object
 *           nullable: true
 *         links:
 *           type: object
 *           nullable: true
 *         options:
 *           type: object
 *           nullable: true
 *         tags:
 *           type: object
 *           nullable: true
 *         variants:
 *           type: object
 *           nullable: true
 *
 *     PaginatedItemsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Item'
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 100
 *             totalPages:
 *               type: integer
 *               example: 10
 *
 *     ChatPromptRequest:
 *       type: object
 *       required:
 *         - prompt
 *       properties:
 *         prompt:
 *           type: string
 *           description: AI prompt for generating items
 *           example: Generate a list of office supplies
 */

/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Item management endpoints
 */

/**
 * @swagger
 * /items:
 *   get:
 *     summary: List all items
 *     description: Retrieves a paginated list of items with optional filtering and sorting
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Space ID to filter items
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for filtering items
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, archived]
 *         description: Filter by item status
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [id, name, price, created_at]
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [commerce, dashboard]
 *         description: Item type filter
 *       - in: query
 *         name: with_inventories
 *         schema:
 *           type: boolean
 *         description: Include inventory data
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedItemsResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *
 *   post:
 *     summary: Create a new item
 *     description: Creates a new item with the provided data
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateItemRequest'
 *     responses:
 *       201:
 *         description: Item successfully created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get item by ID
 *     description: Retrieves a single item by its ID
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Item details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 *
 *   put:
 *     summary: Update an item
 *     description: Updates an existing item with the provided data
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateItemRequest'
 *     responses:
 *       200:
 *         description: Item successfully updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Item'
 *       400:
 *         description: Validation error
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 *
 *   delete:
 *     summary: Delete an item
 *     description: Soft deletes an item by archiving it
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       204:
 *         description: Item successfully deleted
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /items/{id}/inventory:
 *   post:
 *     summary: Update inventory to children
 *     description: Propagates inventory data to child spaces
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Inventory successfully propagated
 *       404:
 *         description: Item not found
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /items/chat:
 *   post:
 *     summary: Generate items with AI
 *     description: Uses AI to generate item suggestions based on a prompt
 *     tags: [Items]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatPromptRequest'
 *     responses:
 *       200:
 *         description: AI-generated response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
