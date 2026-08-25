import io
import cloudinary
import cloudinary.uploader
from PIL import Image

from app.core.config import (
    CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET,
)

# Configure Cloudinary
cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_image(pil_image: Image.Image) -> str:
    """
    Upload PIL image to Cloudinary and return secure URL.
    """
    buf = io.BytesIO()
    pil_image.save(buf, format="JPEG", quality=90)
    buf.seek(0)

    result = cloudinary.uploader.upload(
        buf,
        folder="nutrisnap_meals",
        resource_type="image",
    )

    return result["secure_url"]
