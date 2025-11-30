/**
 * @swagger
 * tags:
 *   name: Items
 *   description: Items management and inventory tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Item:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The item ID
 *         name:
 *           type: string
 *           description: The item name
 *         code:
 *           type: string
 *           nullable: true
 *           description: The item code
 *         sku:
 *           type: string
 *           nullable: true
 *           description: Stock Keeping Unit
 *         description:
 *           type: string
 *           nullable: true
 *           description: Item description
 *         price:
 *           type: string
 *           nullable: true
 *           description: Item price
 *         cost:
 *           type: string
 *           nullable: true
 *           description: Item cost
 *         weight:
 *           type: string
 *           nullable: true
 *           description: Item weight
 *         status:
 *           type: string
 *           enum: [active, inactive, archived]
 *           description: Item status
 *         space_id:
 *           type: integer
 *           nullable: true
 *           description: ID of the space the item belongs to
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     CreateItemInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
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
 *           oneOf:
 *             - type: number
 *             - type: string
 *           nullable: true
 *         cost:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           nullable: true
 *         weight:
 *           oneOf:
 *             - type: number
 *             - type: string
 *           nullable: true
 *         status:
 *           type: string
 *           nullable: true
 *         space_id:
 *           type: integer
 *           nullable: true
 *         notes:
 *           type: string
 *           nullable: true
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           nullable: true
 *     UpdateItemInput:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateItemInput'
 *       description: All fields are optional for update
 *     ChatPromptInput:
 *       type: object
 *       required:
 *         - prompt
 *       properties:
 *         prompt:
 *           type: string
 *           minLength: 1
 *           description: The user prompt for the AI
 */

/**
 * @swagger
 * /items:
 *   get:
 *     summary: List items
 *     description: Retrieve a paginated list of items with optional filtering and sorting
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: space_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Filter items by space ID (includes items from parent space)
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
 *         description: Search term (name, code, sku, notes)
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [id, name, created_at]
 *           default: id
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [commerce, dashboard]
 *           default: dashboard
 *         description: Context type (commerce returns fewer fields)
 *       - in: query
 *         name: with_inventories
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include inventory data for each item
 *     responses:
 *       200:
 *         description: List of items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 *       400:
 *         description: Invalid query parameters
 */

/**
 * @swagger
 * /items/{id}:
 *   get:
 *     summary: Get item details
 *     description: Retrieve details of a specific item by ID
 *     tags: [Items]
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
 */

/**
 * @swagger
 * /items/chat:
 *   post:
 *     summary: Chat with AI about items
 *     description: Generate content or query items using natural language through AI
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatPromptInput'
 *     responses:
 *       200:
 *         description: AI generated response
 *         content:
 *           application/json:
 *             schema:
 *               type: string
 *               description: The AI generated text response
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /items:
 *   post:
 *     summary: Create a new item
 *     description: Create a new item with the provided data
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateItemInput'
 *     responses:
 *       201:
 *         description: Item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 insertId:
 *                   type: string
 *                   description: ID of the created item
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /items/{id}:
 *   put:
 *     summary: Update an item
 *     description: Update an existing item's details
 *     tags: [Items]
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
 *             $ref: '#/components/schemas/UpdateItemInput'
 *     responses:
 *       200:
 *         description: Item updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 numUpdatedRows:
 *                   type: string
 *                   description: Number of rows updated
 *       404:
 *         description: Item not found
 *       400:
 *         description: Invalid input data
 */

/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: Delete an item
 *     description: Soft delete an item (archive)
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       204:
 *         description: Item deleted successfully
 *       404:
 *         description: Item not found
 */

/**
 * @swagger
 * /items/{id}/inventory:
 *   post:
 *     summary: Propagate inventory
 *     description: Propagate the item's inventory to all child spaces of its parent space
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Item ID
 *     responses:
 *       200:
 *         description: Inventory propagation successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 updatedCount:
 *                   type: integer
 *                   description: Number of new inventory records created
 *       404:
 *         description: Item not found
 */
