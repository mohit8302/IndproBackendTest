-- CreateTable
CREATE TABLE "candidate" (
    "candidate_id" SERIAL NOT NULL,
    "candidate_name" TEXT NOT NULL,
    "candidate_email" TEXT NOT NULL,
    "candidate_description" TEXT,
    "candidate_availability" TEXT DEFAULT 'NOT_AVAILABLE',
    "candidate_image_url" TEXT,
    "candidate_video_url" TEXT,
    "candidate_resume_url" TEXT,
    "candidate_experience" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "candidate_rating" INTEGER NOT NULL DEFAULT 0,
    "long_term_commitment" BOOLEAN NOT NULL DEFAULT false,
    "candidate_is_private" BOOLEAN NOT NULL DEFAULT true,
    "candidate_languages" TEXT,
    "candidate_location" TEXT NOT NULL,
    "candidate_created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "candidate_modified_on" TIMESTAMP(3),
    "candidate_removed_on" TIMESTAMP(3),

    CONSTRAINT "candidate_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable
CREATE TABLE "expertise" (
    "id" SERIAL NOT NULL,
    "expertise_name" TEXT NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_on" TIMESTAMP(3),

    CONSTRAINT "expertise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_expertise" (
    "candidate_id" INTEGER NOT NULL,
    "expertise_id" INTEGER NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_expertise_pkey" PRIMARY KEY ("candidate_id","expertise_id")
);

-- CreateTable
CREATE TABLE "technology" (
    "id" SERIAL NOT NULL,
    "technology_name" TEXT NOT NULL,
    "parent_technology_id" INTEGER,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_on" TIMESTAMP(3),

    CONSTRAINT "technology_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "candidate_technology" (
    "candidate_id" INTEGER NOT NULL,
    "technology_id" INTEGER NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_technology_pkey" PRIMARY KEY ("candidate_id","technology_id")
);

-- CreateTable
CREATE TABLE "customer" (
    "customer_id" SERIAL NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_company_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_password" TEXT NOT NULL,
    "customer_approved_on" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "customer_created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customer_modified_on" TIMESTAMP(3),
    "customer_removed_on" TIMESTAMP(3),

    CONSTRAINT "customer_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "booking" (
    "booking_id" SERIAL NOT NULL,
    "booking_name" TEXT NOT NULL,
    "booking_email" TEXT NOT NULL,
    "booking_phone" TEXT NOT NULL,
    "booking_message" TEXT,
    "booking_file_attachment" TEXT,
    "booking_involvement_id" INTEGER NOT NULL,
    "booking_customer_id" INTEGER NOT NULL,
    "booking_created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booking_modified_on" TIMESTAMP(3),
    "booking_removed_on" TIMESTAMP(3),

    CONSTRAINT "booking_pkey" PRIMARY KEY ("booking_id")
);

-- CreateTable
CREATE TABLE "booked_candidates" (
    "booking_id" INTEGER NOT NULL,
    "candidate_id" INTEGER NOT NULL,

    CONSTRAINT "booked_candidates_pkey" PRIMARY KEY ("booking_id","candidate_id")
);

-- CreateTable
CREATE TABLE "involvement" (
    "involvement_id" SERIAL NOT NULL,
    "involvement_name" TEXT NOT NULL,
    "involvement_type" TEXT NOT NULL DEFAULT 'MEDIUM',
    "involvement_created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "involvement_modified_on" TIMESTAMP(3),
    "involvement_removed_on" TIMESTAMP(3),

    CONSTRAINT "involvement_pkey" PRIMARY KEY ("involvement_id")
);

-- CreateTable
CREATE TABLE "translation" (
    "id" SERIAL NOT NULL,
    "original" TEXT NOT NULL,
    "target_lang" TEXT NOT NULL,
    "translated" TEXT NOT NULL,
    "created_on" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_candidate_email_key" ON "candidate"("candidate_email");

-- CreateIndex
CREATE UNIQUE INDEX "expertise_expertise_name_key" ON "expertise"("expertise_name");

-- CreateIndex
CREATE UNIQUE INDEX "technology_technology_name_key" ON "technology"("technology_name");

-- CreateIndex
CREATE INDEX "translation_original_target_lang_idx" ON "translation"("original", "target_lang");

-- CreateIndex
CREATE UNIQUE INDEX "translation_original_target_lang_key" ON "translation"("original", "target_lang");

-- AddForeignKey
ALTER TABLE "candidate_expertise" ADD CONSTRAINT "candidate_expertise_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("candidate_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_expertise" ADD CONSTRAINT "candidate_expertise_expertise_id_fkey" FOREIGN KEY ("expertise_id") REFERENCES "expertise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_technology" ADD CONSTRAINT "candidate_technology_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("candidate_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_technology" ADD CONSTRAINT "candidate_technology_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_booking_involvement_id_fkey" FOREIGN KEY ("booking_involvement_id") REFERENCES "involvement"("involvement_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booking" ADD CONSTRAINT "booking_booking_customer_id_fkey" FOREIGN KEY ("booking_customer_id") REFERENCES "customer"("customer_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booked_candidates" ADD CONSTRAINT "booked_candidates_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "booking"("booking_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "booked_candidates" ADD CONSTRAINT "booked_candidates_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "candidate"("candidate_id") ON DELETE RESTRICT ON UPDATE CASCADE;
